import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";
// GET - Fetch user notifications
export async function GET(req) {
    const auth = await requireAuth();
    if (auth instanceof NextResponse)
        return auth;
    const { searchParams } = req.nextUrl;
    const unreadOnly = searchParams.get("unread") === "true";
    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: auth.id,
                ...(unreadOnly ? { read: false } : {}),
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        return NextResponse.json({ notifications });
    }
    catch (err) {
        return jsonError("Failed to fetch notifications", 500);
    }
}
// PATCH - Mark notification as read
export async function PATCH(req) {
    const auth = await requireAuth();
    if (auth instanceof NextResponse)
        return auth;
    try {
        const { id, read } = await req.json();
        const notification = await prisma.notification.findUnique({
            where: { id },
        });
        if (!notification || notification.userId !== auth.id) {
            return jsonError("Notification not found or unauthorized", 404);
        }
        const updated = await prisma.notification.update({
            where: { id },
            data: { read },
        });
        return NextResponse.json(updated);
    }
    catch (err) {
        return jsonError("Failed to update notification", 500);
    }
}
