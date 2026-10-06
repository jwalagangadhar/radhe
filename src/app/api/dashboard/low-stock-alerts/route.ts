import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    // Get products with low stock
    const lowStockProducts = await prisma.product.findMany({
      where: {
        active: true,
        stock: {
          lte: prisma.product.fields.minStock,
        },
      },
      select: {
        id: true,
        name: true,
        stock: true,
        minStock: true,
        maxStock: true,
        unit: true,
        price: true,
      },
      orderBy: [{ stock: "asc" }],
    });

    // Get critical stock (below 50% of minStock)
    const criticalStock = lowStockProducts.filter((p) => p.stock < p.minStock * 0.5);

    // Get pending stock requests that could help
    const pendingRequests = await prisma.stockRequest.findMany({
      where: { status: "PENDING" },
      include: {
        product: { select: { name: true } },
        worker: { select: { name: true } },
      },
    });

    return NextResponse.json({
      lowStock: lowStockProducts,
      criticalStock,
      pendingRequests,
      summary: {
        totalLow: lowStockProducts.length,
        totalCritical: criticalStock.length,
      },
    });
  } catch (err) {
    return jsonError("Failed to fetch low stock alerts", 500);
  }
}
