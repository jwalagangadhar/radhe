import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateGst } from "@/lib/erp-engine";
import { requireAuth, jsonError } from "@/lib/api";
export async function GET() {
    const auth = await requireAuth(["ADMIN", "WORKER"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        const orders = await prisma.order.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                items: { include: { product: true } },
                customer: true,
                invoice: true,
                deliveryChallan: true,
                createdBy: { select: { name: true, role: true } },
            },
        });
        return NextResponse.json({ orders });
    }
    catch (error) {
        console.error("ERP orders GET error:", error);
        return jsonError("Failed to fetch orders", 500);
    }
}
export async function POST(req) {
    const auth = await requireAuth(["ADMIN", "WORKER"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        const body = await req.json();
        const { customerId, customerName, customerPhone, deliveryAddress, customerStateCode = "27", gstNumber, orderType = "WALK_IN", items, // array of { productId, quantity, unitPrice, discountPercent }
        notes, } = body;
        const createdById = auth.id;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Order must contain at least one item." }, { status: 400 });
        }
        // Get company state code
        const company = await prisma.companySettings.findFirst({ where: { id: "default" } });
        const supplierStateCode = company?.stateCode || "27";
        // Fetch product details for HSN and GST rates (handle variant string if present)
        const baseProductIds = items.map((i) => String(i.productId).split("-")[0]);
        const uniqueIds = Array.from(new Set(baseProductIds));
        const products = await prisma.product.findMany({
            where: { id: { in: uniqueIds } },
        });
        const productMap = new Map(products.map((p) => [p.id, p]));
        // Validation: GST bills strictly allow wholesale bag purchases matching the product's configured bagWeight
        for (const item of items) {
            const baseId = String(item.productId).split("-")[0];
            const qty = Number(item.quantity);
            const prod = productMap.get(baseId);
            const adminBagW = prod?.bagWeight && prod.bagWeight > 0 ? prod.bagWeight : 30;
            const isBagItem = String(item.productId).includes("_bag") ||
                String(item.unit || "").toLowerCase().includes("bag") ||
                prod?.unit?.toLowerCase() === "bag";
            const isValidBag = isBagItem
                ? qty > 0 && Number.isInteger(qty)
                : (qty % adminBagW === 0 || Math.abs(qty - adminBagW) < 0.001);
            if (!isValidBag) {
                return NextResponse.json({
                    error: `GST Bills for "${prod?.name || "Product"}" require wholesale bag purchases in ${adminBagW} kg bags. Loose quantity (${qty} ${prod?.unit || "kg"}) is only allowed for Non-GST Bills.`,
                }, { status: 400 });
            }
        }
        const gstInputs = items.map((item) => {
            const baseId = String(item.productId).split("-")[0];
            const prod = productMap.get(baseId);
            return {
                productId: baseId,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                discountPercent: Number(item.discountPercent || 0),
                gstRate: prod?.gstRate || 5,
                hsnCode: prod?.hsnCode || "1006",
                batchNumber: prod?.batchNumber || "BATCH-001",
            };
        });
        const calcResult = calculateGst(gstInputs, supplierStateCode, customerStateCode);
        // Get next order number
        const maxOrder = await prisma.order.aggregate({ _max: { orderNumber: true } });
        const nextOrderNum = (maxOrder._max.orderNumber || 1000) + 1;
        // Create Order and Items
        const newOrder = await prisma.order.create({
            data: {
                orderNumber: nextOrderNum,
                type: orderType,
                status: "PENDING",
                customerId,
                customerName: customerName || "Guest Customer",
                customerPhone,
                deliveryAddress,
                customerStateCode,
                placeOfSupply: `${customerStateCode}-State`,
                gstNumber,
                totalTaxable: calcResult.totalTaxable,
                totalCgst: calcResult.totalCgst,
                totalSgst: calcResult.totalSgst,
                totalIgst: calcResult.totalIgst,
                total: calcResult.grandTotal,
                notes,
                createdById,
                items: {
                    create: calcResult.items.map((item) => ({
                        productId: item.productId,
                        hsnCode: item.hsnCode,
                        batchNumber: item.batchNumber,
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
            include: {
                items: { include: { product: true } },
                customer: true,
            },
        });
        // Update Product Stock Levels
        for (const item of items) {
            const baseId = String(item.productId).split("-")[0];
            const prod = productMap.get(baseId);
            const bagW = prod?.bagWeight && prod.bagWeight > 0 ? prod.bagWeight : 30;
            const isBagItem = String(item.productId).includes("_bag") ||
                String(item.unit || "").toLowerCase().includes("bag");
            const decrementAmount = isBagItem && prod?.unit?.toLowerCase() === "kg"
                ? Number(item.quantity) * bagW
                : Number(item.quantity);
            await prisma.product.update({
                where: { id: baseId },
                data: { stock: { decrement: decrementAmount } },
            });
        }
        // ── AUTO-GENERATE GST INVOICE in background ────────────────────────────
        const year = new Date().getFullYear();
        const invoiceCount = await prisma.invoice.count();
        const invoiceNumber = `INV-${year}-${(invoiceCount + 1).toString().padStart(4, "0")}`;
        const isInterState = (company?.stateCode || "27") !== customerStateCode;
        const grandTotal = Math.round(calcResult.grandTotal);
        const roundOff = Math.round((grandTotal - calcResult.grandTotal) * 100) / 100;
        const autoInvoice = await prisma.invoice.create({
            data: {
                orderId: newOrder.id,
                invoiceNumber,
                invoiceDate: new Date(),
                placeOfSupply: `${customerStateCode}-State`,
                isInterState,
                totalTaxable: calcResult.totalTaxable,
                totalCgst: calcResult.totalCgst,
                totalSgst: calcResult.totalSgst,
                totalIgst: calcResult.totalIgst,
                discountAmount: 0,
                roundOff,
                grandTotal,
                paymentStatus: "UNPAID",
            },
        });
        // Update order status to INVOICED
        await prisma.order.update({
            where: { id: newOrder.id },
            data: { status: "INVOICED", completedAt: new Date() },
        });
        // ── AUTO-GENERATE DELIVERY CHALLAN in background ───────────────────────
        const challanCount = await prisma.deliveryChallan.count();
        const challanNumber = `DC-${year}-${(challanCount + 1).toString().padStart(4, "0")}`;
        const destination = deliveryAddress?.trim() || "Counter Pickup";
        const autoChallan = await prisma.deliveryChallan.create({
            data: {
                challanNumber,
                orderId: newOrder.id,
                invoiceId: autoInvoice.id,
                transporterName: "Self / Counter Pickup",
                lrNumber: `SELF-${newOrder.orderNumber}`,
                vehicleNumber: "N/A",
                dispatchDate: new Date(),
                destination,
                distanceKm: 0,
                status: "IN_TRANSIT",
                notes: "Auto-generated challan",
            },
        });
        return NextResponse.json({
            message: "Order created — Invoice & Challan auto-generated",
            order: { ...newOrder, status: "INVOICED" },
            invoice: { invoiceNumber: autoInvoice.invoiceNumber, id: autoInvoice.id },
            challan: { challanNumber: autoChallan.challanNumber, id: autoChallan.id },
            orderSlip: {
                orderNumber: newOrder.orderNumber,
                customerName: newOrder.customerName,
                date: newOrder.createdAt,
                items: newOrder.items,
                taxSummary: calcResult.hsnSummary,
                grandTotal: newOrder.total,
                invoiceNumber: autoInvoice.invoiceNumber,
                challanNumber: autoChallan.challanNumber,
            },
        });
    }
    catch (error) {
        console.error("ERP orders POST error:", error);
        return jsonError("Failed to create order", 500);
    }
}
export async function PUT(req) {
    const auth = await requireAuth(["ADMIN", "WORKER"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        const { orderId, status } = await req.json();
        if (!orderId || !status) {
            return jsonError("orderId and status are required", 400);
        }
        if (auth.role === "WORKER" && status !== "PACKING") {
            return jsonError("Workers are only authorized to mark packing status", 403);
        }
        const updated = await prisma.order.update({
            where: { id: orderId },
            data: {
                status,
                approvedAt: status === "APPROVED" ? new Date() : undefined,
                completedAt: status === "COMPLETED" || status === "INVOICED" ? new Date() : undefined,
            },
            include: {
                items: true,
                invoice: true,
                deliveryChallan: true,
            },
        });
        return NextResponse.json({ message: `Order status updated to ${status}`, order: updated });
    }
    catch (error) {
        console.error("ERP orders PUT error:", error);
        return jsonError("Failed to update order status", 500);
    }
}
