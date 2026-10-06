import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api";

type OrderItemWithProduct = {
  product?: { costPrice: number | null } | null;
  quantity: number;
};

type OrderWithItems = {
  total: number;
  completedAt: Date | null;
  items: OrderItemWithProduct[];
};

type ProductStats = {
  stock: number;
  price: number;
  costPrice: number;
  minStock: number;
  name: string;
};

type StockRequestApproved = {
  totalWeight: number;
  reviewedAt: Date | null;
  product: { costPrice: number };
};

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Fetch completed orders with items and product cost price details for profit calculation
  const [
    todayOrders,
    weekOrders,
    monthOrders,
    recentOrders,
    activeProducts,
    pendingWeb,
    draftWalkIn,
    approvedRequests,
    chartOrders,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { status: "COMPLETED", completedAt: { gte: todayStart } },
      include: { items: { include: { product: true } } },
    }),
    prisma.order.findMany({
      where: { status: "COMPLETED", completedAt: { gte: weekStart } },
      include: { items: { include: { product: true } } },
    }),
    prisma.order.findMany({
      where: { status: "COMPLETED", completedAt: { gte: monthStart } },
      include: { items: { include: { product: true } } },
    }),
    prisma.order.findMany({
      where: { status: { in: ["PENDING", "APPROVED", "PACKING", "DRAFT", "COMPLETED", "CANCELLED"] } },
      include: { items: { include: { product: true } }, createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.product.findMany({
      where: { active: true },
    }),
    prisma.order.count({ where: { type: "WEB", status: "PENDING" } }),
    prisma.order.count({ where: { type: "WALK_IN", status: "DRAFT" } }),
    prisma.stockRequest.findMany({
      where: { status: "APPROVED", reviewedAt: { gte: monthStart } },
      include: { product: true },
    }) as Promise<StockRequestApproved[]>,
    prisma.order.findMany({
      where: { status: "COMPLETED", completedAt: { gte: chartStart } },
      select: { id: true, orderNumber: true, total: true, completedAt: true, customerName: true },
      orderBy: { completedAt: "asc" },
    }),
  ]);

  // Sales totals
  const todaySales = todayOrders.reduce((s: number, o: OrderWithItems) => s + o.total, 0);
  const currentWeekSales = weekOrders.reduce((s: number, o: OrderWithItems) => s + o.total, 0);
  const currentMonthSales = monthOrders.reduce((s: number, o: OrderWithItems) => s + o.total, 0);

  // Profit calculation helper (total sale - total cost)
  const calculateProfit = (ordersList: OrderWithItems[]) => {
    return ordersList.reduce((sum: number, order: OrderWithItems) => {
      const orderCost = order.items.reduce((costSum: number, item: OrderItemWithProduct) => {
        const costPrice = item.product?.costPrice ?? 0;
        return costSum + (costPrice * item.quantity);
      }, 0);
      return sum + (order.total - orderCost);
    }, 0);
  };

  const todayProfit = calculateProfit(todayOrders);
  const monthProfit = calculateProfit(monthOrders);

  // Purchases tracking (approved stock requests * product costPrice)
  const todayPurchases = approvedRequests
    .filter((r: StockRequestApproved) => r.reviewedAt && r.reviewedAt >= todayStart)
    .reduce((sum: number, r: StockRequestApproved) => sum + (r.totalWeight * r.product.costPrice), 0);

  const monthPurchases = approvedRequests
    .reduce((sum: number, r: StockRequestApproved) => sum + (r.totalWeight * r.product.costPrice), 0);

  // Chart data uses stable date keys so the UI can select a point.
  const dailyMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dailyMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const o of weekOrders) {
    if (!o.completedAt) continue;
    const date = new Date(o.completedAt).toISOString().slice(0, 10);
    dailyMap[date] = (dailyMap[date] ?? 0) + o.total;
  }

  const weeklyMap: Record<string, number> = {};
  const monthlyMap: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    weeklyMap[monday.toISOString().slice(0, 10)] = 0;
  }
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMap[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = 0;
  }
  for (const order of chartOrders) {
    if (!order.completedAt) continue;
    const d = new Date(order.completedAt);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const weekKey = monday.toISOString().slice(0, 10);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (weekKey in weeklyMap) weeklyMap[weekKey] += order.total;
    if (monthKey in monthlyMap) monthlyMap[monthKey] += order.total;
  }

  // Stock Summaries
  const totalStockQuantity = activeProducts.reduce((sum: number, p: ProductStats) => sum + p.stock, 0);
  const totalStockValue = activeProducts.reduce((sum: number, p: ProductStats) => sum + (p.stock * p.price), 0);
  const totalCostValue = activeProducts.reduce((sum: number, p: ProductStats) => sum + (p.stock * p.costPrice), 0);
  const lowStockCount = activeProducts.filter((p: ProductStats) => p.stock <= p.minStock).length;

  return NextResponse.json({
    stats: {
      todaySales,
      todayProfit,
      todayPurchases,
      todayOrderCount: todayOrders.length,
      pendingWebOrders: pendingWeb,
      draftWalkInOrders: draftWalkIn,
      currentWeekSales,
      currentMonthSales,
      monthProfit,
      monthPurchases,
    },
    stockSummary: {
      totalProducts: activeProducts.length,
      totalStockQuantity,
      totalStockValue,
      totalCostValue,
      lowStockCount,
    },
    sales: {
      daily: Object.entries(dailyMap).map(([date, total]) => ({ date, label: new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short" }), total })),
      weekly: Object.entries(weeklyMap).map(([date, total]) => ({ date, label: new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), total })),
      monthly: Object.entries(monthlyMap).map(([date, total]) => ({ date, label: new Date(`${date}-01T12:00:00`).toLocaleDateString("en-IN", { month: "short" }), total })),
      orders: chartOrders,
    },
    stock: {
      topProducts: activeProducts
        .sort((a: ProductStats, b: ProductStats) => a.stock - b.stock)
        .slice(0, 8)
        .map((p: ProductStats) => ({ name: p.name, stock: p.stock })),
    },
    recentOrders,
  });
}
