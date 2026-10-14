import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonError } from "@/lib/api";
export async function GET() {
    const auth = await requireAuth(["ADMIN"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // 1. Daily Sales
        const todayOrders = await prisma.order.findMany({
            where: {
                createdAt: { gte: today },
                status: { notIn: ["CANCELLED"] },
            },
        });
        const dailySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
        const todayOrderCount = todayOrders.length;
        // 2. Pending Orders
        const pendingOrdersCount = await prisma.order.count({
            where: { status: "PENDING" },
        });
        // 3. Receivables (Unpaid & Partial Invoices)
        const unpaidInvoices = await prisma.invoice.findMany({
            where: { paymentStatus: { in: ["UNPAID", "PARTIAL"] } },
        });
        const totalReceivables = unpaidInvoices.reduce((sum, inv) => sum + (inv.grandTotal - inv.paidAmount), 0);
        // 4. GST Liabilities (Tax Breakdown)
        const allInvoices = await prisma.invoice.findMany();
        const cgstLiability = allInvoices.reduce((sum, inv) => sum + inv.totalCgst, 0);
        const sgstLiability = allInvoices.reduce((sum, inv) => sum + inv.totalSgst, 0);
        const igstLiability = allInvoices.reduce((sum, inv) => sum + inv.totalIgst, 0);
        const totalGstLiability = cgstLiability + sgstLiability + igstLiability;
        // 5. Chart of Accounts Summary
        const ledgerAccounts = await prisma.ledgerAccount.findMany({
            orderBy: { code: "asc" },
        });
        // 6. Recent Active Orders with Items & Customers
        const recentOrders = await prisma.order.findMany({
            take: 8,
            orderBy: { createdAt: "desc" },
            include: {
                items: { include: { product: true } },
                customer: true,
                invoice: true,
                deliveryChallan: true,
            },
        });
        return NextResponse.json({
            metrics: {
                dailySales,
                todayOrderCount,
                pendingOrdersCount,
                totalReceivables,
                gstLiability: {
                    cgst: cgstLiability,
                    sgst: sgstLiability,
                    igst: igstLiability,
                    total: totalGstLiability,
                },
            },
            ledgerAccounts,
            recentOrders,
        });
    }
    catch (error) {
        console.error("ERP metrics error:", error);
        return jsonError("Failed to fetch ERP metrics", 500);
    }
}
