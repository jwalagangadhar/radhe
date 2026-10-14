import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
export const runtime = "nodejs";
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return NextResponse.json({ error: "Access denied. Administrator privileges required." }, { status: 403 });
        }
        const customers = await prisma.customerUser.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                phone: true,
                phoneVerified: true,
                email: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                // Strictly DO NOT include otpRequests!
                _count: {
                    select: {
                        orders: true,
                        addresses: true,
                    },
                },
                orders: {
                    take: 10,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        orderNumber: true,
                        total: true,
                        status: true,
                        createdAt: true,
                        invoice: {
                            select: {
                                invoiceNumber: true,
                                paymentStatus: true,
                            },
                        },
                    },
                },
            },
        });
        return NextResponse.json({ customers });
    }
    catch (err) {
        console.error("[admin/customers GET error]:", err);
        return NextResponse.json({ error: "Failed to fetch customers list." }, { status: 500 });
    }
}
