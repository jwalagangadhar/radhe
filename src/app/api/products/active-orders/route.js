import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api";
export async function GET() {
    const auth = await requireAuth(["ADMIN"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        // Get count of active (non-completed) orders per product
        const counts = await prisma.orderItem.groupBy({
            by: ["productId"],
            where: {
                order: { status: { not: "COMPLETED" } },
            },
            _count: true,
        });
        const result = {};
        counts.forEach((c) => {
            result[c.productId] = c._count;
        });
        return NextResponse.json({ counts: result });
    }
    catch (err) {
        console.error("Error fetching active order counts:", err);
        return NextResponse.json({ counts: {} });
    }
}
