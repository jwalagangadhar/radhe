import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getNextOrderNumber, jsonError, requireAuth } from "@/lib/api";
import { sendOrderAlert } from "@/lib/notifications";
const orderItemSchema = z.object({
    productId: z.string(),
    quantity: z.number().positive(),
});
const webOrderSchema = z.object({
    type: z.literal("WEB"),
    customerName: z.string().min(1),
    customerPhone: z.string().min(10),
    deliveryAddress: z.string().min(5),
    gstNumber: z.string().optional(),
    items: z.array(orderItemSchema).min(1),
});
const walkInSchema = z.object({
    type: z.literal("WALK_IN"),
    status: z.enum(["DRAFT", "COMPLETED"]).default("DRAFT"),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    deliveryAddress: z.string().optional(),
    customerStateCode: z.string().optional(),
    placeOfSupply: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(orderItemSchema).min(1),
    total: z.number().optional(),
});
export async function GET(req) {
    const auth = await requireAuth(["ADMIN", "WORKER"]);
    if (auth instanceof NextResponse)
        return auth;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const queue = searchParams.get("queue") === "true";
    const where = {};
    if (queue) {
        where.status = { in: ["PENDING", "APPROVED", "PACKING"] };
        where.type = "WEB";
    }
    else if (status) {
        where.status = status;
    }
    if (type && !queue) {
        where.type = type;
    }
    const orders = await prisma.order.findMany({
        where,
        include: {
            items: { include: { product: true } },
            createdBy: { select: { id: true, name: true } },
            invoice: { select: { invoiceNumber: true } },
            deliveryChallan: { select: { challanNumber: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ orders });
}
async function buildOrderItems(items) {
    const productIds = items.map((i) => i.productId.split("-")[0]);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds }, active: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    let total = 0;
    const orderItems = [];
    for (const item of items) {
        const baseId = item.productId.split("-")[0];
        const product = productMap.get(baseId) || productMap.get(item.productId);
        if (!product)
            throw new Error(`Product not found: ${item.productId}`);
        if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
        }
        const subtotal = product.price * item.quantity;
        total += subtotal;
        orderItems.push({
            productId: product.id,
            quantity: item.quantity,
            unitPrice: product.price,
            subtotal,
        });
    }
    return { orderItems, total };
}
export async function POST(req) {
    try {
        const body = await req.json();
        if (body.type === "WEB") {
            const data = webOrderSchema.parse(body);
            const { orderItems, total } = await buildOrderItems(data.items);
            const orderNumber = await getNextOrderNumber();
            const order = await prisma.$transaction(async (tx) => {
                const created = await tx.order.create({
                    data: {
                        orderNumber,
                        type: "WEB",
                        status: "PENDING",
                        customerName: data.customerName,
                        customerPhone: data.customerPhone,
                        deliveryAddress: data.deliveryAddress,
                        gstNumber: data.gstNumber || null,
                        total,
                        items: { create: orderItems },
                    },
                    include: {
                        items: { include: { product: true } },
                    },
                });
                for (const item of orderItems) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } },
                    });
                }
                return created;
            });
            await sendOrderAlert(order);
            return NextResponse.json({ order }, { status: 201 });
        }
        if (body.type === "WALK_IN") {
            const auth = await requireAuth(["ADMIN", "WORKER"]);
            if (auth instanceof NextResponse)
                return auth;
            const data = walkInSchema.parse(body);
            const { orderItems, total } = await buildOrderItems(data.items);
            const orderNumber = await getNextOrderNumber();
            const isWorkerDraft = auth.role === "WORKER" || data.status === "DRAFT";
            const order = await prisma.order.create({
                data: {
                    orderNumber,
                    type: "WALK_IN",
                    status: isWorkerDraft ? "DRAFT" : data.status,
                    customerName: data.customerName,
                    customerPhone: data.customerPhone,
                    deliveryAddress: data.deliveryAddress,
                    customerStateCode: data.customerStateCode ?? "37",
                    placeOfSupply: data.placeOfSupply ?? "37-Andhra Pradesh",
                    notes: data.notes,
                    total: data.total ?? total,
                    createdById: auth.id,
                    items: { create: orderItems },
                },
                include: {
                    items: { include: { product: true } },
                    createdBy: { select: { id: true, name: true } },
                },
            });
            if (!isWorkerDraft && data.status === "COMPLETED") {
                await prisma.$transaction(async (tx) => {
                    for (const item of orderItems) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: { decrement: item.quantity } },
                        });
                    }
                    await tx.order.update({
                        where: { id: order.id },
                        data: { completedAt: new Date() },
                    });
                });
            }
            return NextResponse.json({ order }, { status: 201 });
        }
        return jsonError("Invalid order type");
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            return jsonError(err.errors[0]?.message ?? "Invalid order data");
        }
        if (err instanceof Error)
            return jsonError(err.message);
        return jsonError("Failed to create order", 500);
    }
}
