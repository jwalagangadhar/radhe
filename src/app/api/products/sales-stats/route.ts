import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api";

export async function GET() {
  const auth = await requireAuth(["ADMIN", "WORKER"]);
  if (auth instanceof NextResponse) return auth;

  try {
    // Fetch all order items from valid (non-cancelled) orders with invoice & GST details
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          status: { not: "CANCELLED" },
        },
      },
      select: {
        productId: true,
        quantity: true,
        subtotal: true,
        gstRate: true,
        order: {
          select: {
            id: true,
            type: true,
            invoice: { select: { id: true } },
          },
        },
      },
    });

    // Fetch order counts per category
    const [counterGstOrders, counterNonGstOrders, webOrders] = await Promise.all([
      prisma.order.count({
        where: {
          type: "WALK_IN",
          status: { not: "CANCELLED" },
          invoice: { isNot: null },
        },
      }),
      prisma.order.count({
        where: {
          type: "WALK_IN",
          status: { not: "CANCELLED" },
          invoice: null,
        },
      }),
      prisma.order.count({
        where: {
          type: "WEB",
          status: { not: "CANCELLED" },
        },
      }),
    ]);

    let totalCounterGstRevenue = 0;
    let totalCounterGstQty = 0;
    let totalCounterNonGstRevenue = 0;
    let totalCounterNonGstQty = 0;
    let totalWebRevenue = 0;
    let totalWebQty = 0;

    const productSalesMap: Record<
      string,
      {
        counterGstQty: number;
        counterGstRevenue: number;
        counterNonGstQty: number;
        counterNonGstRevenue: number;
        webQty: number;
        webRevenue: number;
      }
    > = {};

    for (const item of orderItems) {
      const pId = item.productId;
      if (!productSalesMap[pId]) {
        productSalesMap[pId] = {
          counterGstQty: 0,
          counterGstRevenue: 0,
          counterNonGstQty: 0,
          counterNonGstRevenue: 0,
          webQty: 0,
          webRevenue: 0,
        };
      }

      if (item.order.type === "WEB") {
        productSalesMap[pId].webQty += item.quantity;
        productSalesMap[pId].webRevenue += item.subtotal;
        totalWebQty += item.quantity;
        totalWebRevenue += item.subtotal;
      } else {
        // WALK_IN order — check if GST Tax Bill (invoice attached or gstRate > 0)
        const isGst = Boolean(item.order.invoice) || item.gstRate > 0;
        if (isGst) {
          productSalesMap[pId].counterGstQty += item.quantity;
          productSalesMap[pId].counterGstRevenue += item.subtotal;
          totalCounterGstQty += item.quantity;
          totalCounterGstRevenue += item.subtotal;
        } else {
          productSalesMap[pId].counterNonGstQty += item.quantity;
          productSalesMap[pId].counterNonGstRevenue += item.subtotal;
          totalCounterNonGstQty += item.quantity;
          totalCounterNonGstRevenue += item.subtotal;
        }
      }
    }

    const totalOrders = counterGstOrders + counterNonGstOrders + webOrders;
    const totalRevenue = totalCounterGstRevenue + totalCounterNonGstRevenue + totalWebRevenue;

    return NextResponse.json({
      summary: {
        counterGstOrders,
        counterGstRevenue: Math.round(totalCounterGstRevenue * 100) / 100,
        counterGstQty: Math.round(totalCounterGstQty * 100) / 100,
        counterNonGstOrders,
        counterNonGstRevenue: Math.round(totalCounterNonGstRevenue * 100) / 100,
        counterNonGstQty: Math.round(totalCounterNonGstQty * 100) / 100,
        webOrders,
        webRevenue: Math.round(totalWebRevenue * 100) / 100,
        webQty: Math.round(totalWebQty * 100) / 100,
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
      },
      productStats: productSalesMap,
    });
  } catch (error) {
    console.error("Failed to calculate sales stats:", error);
    return NextResponse.json({ error: "Failed to fetch channel sales statistics" }, { status: 500 });
  }
}
