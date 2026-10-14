import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
export const runtime = "nodejs";
export async function GET(req) {
    try {
        const session = await getCustomerSession(req);
        if (!session) {
            return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
        }
        // Fetch fresh user profile and address/order count
        const user = await prisma.customerUser.findUnique({
            where: { id: session.id },
            select: {
                id: true,
                name: true,
                phone: true,
                phoneVerified: true,
                email: true,
                status: true,
                createdAt: true,
                _count: {
                    select: {
                        orders: true,
                        addresses: true,
                    },
                },
            },
        });
        if (!user || user.status !== "ACTIVE") {
            return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
        }
        return NextResponse.json({
            authenticated: true,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                phoneVerified: user.phoneVerified,
                email: user.email,
                status: user.status,
                createdAt: user.createdAt,
                orderCount: user._count.orders,
                addressCount: user._count.addresses,
            },
        });
    }
    catch (err) {
        console.error("[customer/auth/me error]:", err);
        return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
    }
}
