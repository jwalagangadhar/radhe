import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { calculateGst } from "@/lib/erp-engine";
import { enqueueBackgroundTasks } from "@/lib/background";
import { getCustomerSession } from "@/lib/customer-auth";
export const runtime = "nodejs";
const orderItemSchema = z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().optional(),
});
const transportSchema = z.object({
    transporterName: z.string().optional(),
    lrNumber: z.string().optional(),
    vehicleNumber: z.string().optional(),
    dispatchDate: z.string().optional(),
    destination: z.string().optional(),
    distanceKm: z.number().optional().default(10),
    eWayBillNo: z.string().optional(),
    notes: z.string().optional(),
});
const checkoutSchema = z.object({
    // Customer & Shipping Details
    customerName: z.string().min(1).optional(),
    shopName: z.string().min(1).optional(),
    deliveryAddress: z.string().min(5).optional(),
    shopAddress: z.string().min(5).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    gstNumber: z.string().optional(),
    deliveryAddressId: z.string().optional(),
    saveAddress: z.boolean().optional().default(false),
    idempotencyKey: z.string().optional(),
    // GST & Supply Details
    customerStateCode: z.string().min(2).default("37"),
    placeOfSupply: z.string().default("37-Andhra Pradesh"),
    transporterName: z.string().optional(),
    transport: transportSchema.optional(),
    // Line Items
    items: z.array(orderItemSchema).min(1),
});
// Cache for idempotency keys to prevent duplicate order submissions within 30 seconds
const idempotencyCache = new Map();
export async function POST(req) {
    try {
        // 1. Mandatory Customer Authentication Check
        const customerSession = await getCustomerSession(req);
        if (!customerSession) {
            return NextResponse.json({
                error: "Authentication required. Please log in with your mobile number to place an order.",
                requiresAuth: true,
            }, { status: 401 });
        }
        const body = await req.json();
        const data = checkoutSchema.parse(body);
        // 2. Check Idempotency Key (Double submit prevention)
        if (data.idempotencyKey) {
            const cached = idempotencyCache.get(data.idempotencyKey);
            if (cached && Date.now() - cached.timestamp < 30000) {
                return NextResponse.json({
                    message: "Order already processed.",
                    orderNumber: cached.orderNumber,
                    invoiceNumber: cached.invoiceNumber,
                    challanNumber: cached.challanNumber,
                });
            }
        }
        // Resolve unified fields
        const finalCustomerName = (data.customerName || data.shopName || customerSession.name || "Customer").trim();
        const finalPhone = customerSession.phone;
        const finalAddress = (data.deliveryAddress || data.shopAddress || "").trim();
        const finalCity = (data.city || "").trim();
        const finalState = (data.state || "Andhra Pradesh").trim();
        const finalPincode = (data.pincode || "").trim();
        if (!finalAddress) {
            return NextResponse.json({ error: "Delivery address is required." }, { status: 400 });
        }
        // Combine address for display if city/pincode supplied
        const fullFormattedAddress = [
            finalAddress,
            finalCity,
            finalState,
            finalPincode ? `PIN: ${finalPincode}` : null,
        ]
            .filter(Boolean)
            .join(", ");
        // 3. Save or update delivery address in CustomerAddress table if requested or if deliveryAddressId not provided
        let linkedAddressId = data.deliveryAddressId || null;
        if (!linkedAddressId && (data.saveAddress || finalCity || finalPincode)) {
            try {
                const savedAddr = await prisma.customerAddress.create({
                    data: {
                        userId: customerSession.id,
                        name: finalCustomerName,
                        phone: finalPhone,
                        address: finalAddress,
                        city: finalCity || "Vijayawada",
                        state: finalState || "Andhra Pradesh",
                        pincode: finalPincode || "520001",
                        isDefault: false,
                    },
                });
                linkedAddressId = savedAddr.id;
            }
            catch {
                // Continue if address creation fails
            }
        }
        // Update customer name & email on CustomerUser record if provided and not yet filled
        if (data.email || (finalCustomerName && finalCustomerName !== customerSession.name)) {
            try {
                await prisma.customerUser.update({
                    where: { id: customerSession.id },
                    data: {
                        name: finalCustomerName,
                        ...(data.email ? { email: data.email.toLowerCase() } : {}),
                    },
                });
            }
            catch {
                // Non-critical update
            }
        }
        const company = await prisma.companySettings.findFirst({ where: { id: "default" } });
        const supplierStateCode = company?.stateCode ?? "37";
        const isInterState = supplierStateCode !== data.customerStateCode;
        const productIds = data.items.map((item) => item.productId.split("-")[0]);
        const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
        const productMap = new Map(products.map((product) => [product.id, product]));
        const gstInputs = data.items.map((item) => {
            const baseId = item.productId.split("-")[0];
            const product = productMap.get(baseId) || productMap.get(item.productId);
            if (!product)
                throw new Error(`Product not found: ${item.productId}`);
            const bagW = product.bagWeight && product.bagWeight > 0 ? product.bagWeight : 30;
            const effectivePrice = product.webPrice ?? product.price;
            // Derive unit price strictly on the server from database pricing
            const unitPrice = Math.round(effectivePrice * bagW);
            if (product.stock < item.quantity) {
                throw new Error(`Insufficient stock for product ${product.name}`);
            }
            return {
                productId: product.id,
                quantity: item.quantity,
                unitPrice: unitPrice,
                discountPercent: 0,
                gstRate: product.gstRate,
                hsnCode: product.hsnCode,
                batchNumber: product.batchNumber ?? "BATCH-001",
            };
        });
        const gstResult = calculateGst(gstInputs, supplierStateCode, data.customerStateCode);
        const nextOrderNumber = (await prisma.order.aggregate({ _max: { orderNumber: true } }))._max.orderNumber ?? 1000;
        const orderNumber = nextOrderNumber + 1;
        const invoiceNumber = `INV-${new Date().getFullYear()}-${orderNumber}`;
        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    orderNumber,
                    type: "WEB",
                    status: "PENDING",
                    // Link customer unique user ID
                    userId: customerSession.id,
                    deliveryAddressId: linkedAddressId,
                    customerName: finalCustomerName,
                    customerPhone: finalPhone,
                    deliveryAddress: fullFormattedAddress,
                    customerStateCode: data.customerStateCode,
                    placeOfSupply: data.placeOfSupply,
                    gstNumber: data.gstNumber ? data.gstNumber.trim().toUpperCase() : null,
                    totalTaxable: gstResult.totalTaxable,
                    totalCgst: gstResult.totalCgst,
                    totalSgst: gstResult.totalSgst,
                    totalIgst: gstResult.totalIgst,
                    total: gstResult.grandTotal,
                    notes: data.transport?.notes,
                    items: {
                        create: gstResult.items.map((item) => ({
                            productId: item.productId,
                            hsnCode: item.hsnCode,
                            batchNumber: item.batchNumber ?? undefined,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            discount: item.discountAmount,
                            gstRate: item.gstRate,
                            cgstAmount: item.cgstAmount,
                            sgstAmount: item.sgstAmount,
                            igstAmount: item.igstAmount,
                            subtotal: item.subtotal,
                        })),
                    },
                },
            });
            const invoice = await tx.invoice.create({
                data: {
                    orderId: order.id,
                    invoiceNumber,
                    invoiceDate: new Date(),
                    placeOfSupply: data.placeOfSupply,
                    isInterState,
                    totalTaxable: gstResult.totalTaxable,
                    totalCgst: gstResult.totalCgst,
                    totalSgst: gstResult.totalSgst,
                    totalIgst: gstResult.totalIgst,
                    discountAmount: 0,
                    roundOff: gstResult.roundOff,
                    grandTotal: gstResult.grandTotal,
                    paymentStatus: "UNPAID",
                },
            });
            const challan = await tx.deliveryChallan.create({
                data: {
                    challanNumber: `DC-${new Date().getFullYear()}-${orderNumber}`,
                    orderId: order.id,
                    invoiceId: invoice.id,
                    transporterName: data.transporterName ?? data.transport?.transporterName ?? "TBD Transport",
                    lrNumber: data.transport?.lrNumber ?? `LR-${orderNumber}`,
                    vehicleNumber: data.transport?.vehicleNumber ?? "TBD",
                    dispatchDate: data.transport?.dispatchDate ? new Date(data.transport.dispatchDate) : new Date(),
                    destination: finalCity || data.transport?.destination || "Dispatch Warehouse",
                    distanceKm: data.transport?.distanceKm ?? 10,
                    eWayBillNo: data.transport?.eWayBillNo,
                    status: "IN_TRANSIT",
                    notes: data.transport?.notes,
                },
            });
            const stockDecrements = new Map();
            for (const item of gstResult.items) {
                stockDecrements.set(item.productId, (stockDecrements.get(item.productId) || 0) + item.quantity);
            }
            await Promise.all(Array.from(stockDecrements.entries()).map(([productId, quantity]) => tx.product.update({
                where: { id: productId },
                data: { stock: { decrement: quantity } },
            })));
            return {
                order,
                invoice,
                challan,
            };
        });
        // Store in idempotency cache
        if (data.idempotencyKey) {
            idempotencyCache.set(data.idempotencyKey, {
                orderNumber: result.order.orderNumber,
                invoiceNumber: result.invoice.invoiceNumber,
                challanNumber: result.challan.challanNumber,
                timestamp: Date.now(),
            });
            // Periodic cleanup
            if (idempotencyCache.size > 1000) {
                const threshold = Date.now() - 60000;
                for (const [k, v] of idempotencyCache.entries()) {
                    if (v.timestamp < threshold)
                        idempotencyCache.delete(k);
                }
            }
        }
        void enqueueBackgroundTasks(result.order.id, result.invoice.id, result.challan.id);
        return NextResponse.json({
            message: "Order placed successfully.",
            orderNumber: result.order.orderNumber,
            invoiceNumber: result.invoice.invoiceNumber,
            challanNumber: result.challan.challanNumber,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Failed to complete checkout.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
