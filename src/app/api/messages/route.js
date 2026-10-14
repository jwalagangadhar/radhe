import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";
const createSchema = z.object({
    body: z.string().min(1),
});
export async function GET() {
    const auth = await requireAuth(["ADMIN", "WORKER"]);
    if (auth instanceof NextResponse)
        return auth;
    const messages = await prisma.message.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
            sender: { select: { id: true, name: true, role: true } },
        },
    });
    // Return chronologically (oldest first for normal chat flow)
    return NextResponse.json({ messages: messages.reverse() });
}
export async function POST(req) {
    const auth = await requireAuth(["ADMIN", "WORKER"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        const data = createSchema.parse(await req.json());
        const message = await prisma.message.create({
            data: {
                body: data.body,
                senderId: auth.id,
            },
            include: {
                sender: { select: { id: true, name: true, role: true } },
            },
        });
        return NextResponse.json({ message }, { status: 201 });
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            return jsonError("Message body is required");
        }
        return jsonError("Failed to send message", 500);
    }
}
export async function DELETE(req) {
    const auth = await requireAuth(["ADMIN"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (id) {
            await prisma.message.delete({ where: { id } });
        }
        else {
            await prisma.message.deleteMany({});
        }
        return NextResponse.json({ success: true });
    }
    catch {
        return jsonError("Failed to delete chat message", 500);
    }
}
