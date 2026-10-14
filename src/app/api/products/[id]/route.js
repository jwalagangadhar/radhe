import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";
const updateSchema = z.object({
    name: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    price: z.number().positive().optional(),
    costPrice: z.number().min(0).optional(),
    webPrice: z.number().min(0).nullable().optional(),
    counterPrice: z.number().min(0).nullable().optional(),
    counterGstPrice: z.number().min(0).nullable().optional(),
    barcode: z.string().nullable().optional(),
    stock: z.number().min(0).optional(),
    unpackedStock: z.number().min(0).optional(),
    bagWeight: z.number().positive().optional(),
    minStock: z.number().min(0).optional(),
    maxStock: z.number().min(0).optional(),
    minBulkBags: z.number().int().min(1).optional(),
    maxBulkBags: z.number().int().min(1).optional(),
    unit: z.string().optional(),
    image: z.string().nullable().optional(),
    active: z.boolean().optional(),
    availability: z.enum(["GST", "NON_GST", "BOTH", "WEB", "WALK_IN"]).optional(),
    parentId: z.string().nullable().optional(),
});
export async function PATCH(req, { params }) {
    const auth = await requireAuth(["ADMIN"]);
    if (auth instanceof NextResponse)
        return auth;
    const { id } = await params;
    try {
        const data = updateSchema.parse(await req.json());
        const product = await prisma.product.update({ where: { id }, data });
        return NextResponse.json({ product });
    }
    catch (err) {
        if (err instanceof z.ZodError)
            return jsonError("Invalid product data");
        return jsonError("Product not found", 404);
    }
}
export async function DELETE(_req, { params }) {
    const auth = await requireAuth(["ADMIN"]);
    if (auth instanceof NextResponse)
        return auth;
    const { id } = await params;
    try {
        // If the product is referenced by any non-completed orders, do not delete.
        const blockingCount = await prisma.orderItem.count({
            where: {
                productId: id,
                order: { status: { not: "COMPLETED" } },
            },
        });
        if (blockingCount > 0) {
            return jsonError("Cannot delete product because it is used in orders that are not completed.", 400);
        }
        // Remove dependent history records before deleting the product. Active orders
        // were checked above, so completed order items can safely be removed too.
        await prisma.$transaction([
            prisma.orderItem.deleteMany({
                where: {
                    productId: id,
                    order: { status: "COMPLETED" },
                },
            }),
            prisma.stockRequest.deleteMany({ where: { productId: id } }),
            prisma.stockAdjustment.deleteMany({ where: { productId: id } }),
            prisma.stockAddition.deleteMany({ where: { productId: id } }),
            prisma.stockArrival.deleteMany({ where: { productId: id } }),
            prisma.product.delete({ where: { id } }),
        ]);
        return NextResponse.json({ ok: true });
    }
    catch {
        return jsonError("Product not found", 404);
    }
}
