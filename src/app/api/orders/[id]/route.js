import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";
const updateSchema = z.object({
    status: z
        .enum(["PENDING", "DRAFT", "APPROVED", "PACKING", "COMPLETED", "CANCELLED"])
        .optional(),
    total: z.number().min(0).optional(),
    notes: z.string().optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
});
export async function GET(_req, { params }) {
    const auth = await requireAuth(["ADMIN", "WORKER"]);
    if (auth instanceof NextResponse)
        return auth;
    const { id } = await params;
    const order = await prisma.order.findUnique({
        where: { id },
        include: {
            items: { include: { product: true } },
            createdBy: { select: { id: true, name: true } },
        },
    });
    if (!order)
        return jsonError("Order not found", 404);
    return NextResponse.json({ order });
}
export async function PATCH(req, { params }) {
    const auth = await requireAuth(["ADMIN", "WORKER"]);
    if (auth instanceof NextResponse)
        return auth;
    const { id } = await params;
    try {
        const data = updateSchema.parse(await req.json());
        const existing = await prisma.order.findUnique({
            where: { id },
            include: { items: true },
        });
        if (!existing)
            return jsonError("Order not found", 404);
        if (auth.role === "WORKER") {
            const allowed = ["PACKING"];
            if (data.status && !allowed.includes(data.status)) {
                return jsonError("Workers can only update packing status", 403);
            }
            if (data.total !== undefined ||
                data.customerName !== undefined ||
                data.customerPhone !== undefined) {
                return jsonError("Workers do not have permission to modify order pricing or customer data", 403);
            }
        }
        const updates = {};
        if (data.status)
            updates.status = data.status;
        if (data.total !== undefined)
            updates.total = data.total;
        if (data.notes !== undefined)
            updates.notes = data.notes;
        if (data.customerName !== undefined)
            updates.customerName = data.customerName;
        if (data.customerPhone !== undefined)
            updates.customerPhone = data.customerPhone;
        if (data.status === "APPROVED" && existing.status === "DRAFT") {
            updates.approvedAt = new Date();
        }
        const completing = data.status === "COMPLETED" && existing.status !== "COMPLETED";
        if (completing) {
            updates.completedAt = new Date();
        }
        const order = await prisma.$transaction(async (tx) => {
            if (completing && existing.type === "WALK_IN" && existing.status === "DRAFT") {
                for (const item of existing.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } },
                    });
                }
            }
            if (completing && existing.type === "WEB" && existing.status !== "CANCELLED") {
                // Stock already decremented on web checkout
            }
            return tx.order.update({
                where: { id },
                data: updates,
                include: {
                    items: { include: { product: true } },
                    createdBy: { select: { id: true, name: true } },
                },
            });
        });
        return NextResponse.json({ order });
    }
    catch (err) {
        if (err instanceof z.ZodError)
            return jsonError("Invalid update data");
        return jsonError("Failed to update order", 500);
    }
}
export async function DELETE(_req, { params }) {
    const auth = await requireAuth(["ADMIN"]);
    if (auth instanceof NextResponse)
        return auth;
    const { id } = await params;
    try {
        const existing = await prisma.order.findUnique({
            where: { id },
        });
        if (!existing) {
            return jsonError("Order not found", 404);
        }
        // Optional: Only allow deleting completed or cancelled orders to preserve active inventory flow
        if (!["COMPLETED", "CANCELLED"].includes(existing.status)) {
            return jsonError("Only completed or cancelled orders can be deleted", 400);
        }
        await prisma.order.delete({
            where: { id },
        });
        return NextResponse.json({ success: true });
    }
    catch (err) {
        return jsonError("Failed to delete order", 500);
    }
}
