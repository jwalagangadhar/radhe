import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api";
export async function GET(req) {
    const auth = await requireAuth(["ADMIN", "WORKER"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        const url = new URL(req.url);
        const phone = url.searchParams.get("phone");
        if (phone) {
            const customer = await prisma.customer.findFirst({ where: { phone } });
            return NextResponse.json({ customer });
        }
        const customers = await prisma.customer.findMany({
            orderBy: { name: "asc" },
        });
        return NextResponse.json({ customers });
    }
    catch (error) {
        return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }
}
export async function POST(req) {
    const auth = await requireAuth(["ADMIN", "WORKER"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        const body = await req.json();
        const { name, phone, email, address, city, state = "Maharashtra", stateCode = "27", gstNumber, creditLimit = 50000 } = body;
        if (!name || !phone) {
            return NextResponse.json({ error: "Customer name and phone number are required." }, { status: 400 });
        }
        const customer = await prisma.customer.create({
            data: {
                name,
                phone,
                email,
                address,
                city,
                state,
                stateCode,
                gstNumber,
                creditLimit: Number(creditLimit),
            },
        });
        return NextResponse.json({ message: "Customer created successfully", customer });
    }
    catch (error) {
        return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
    }
}
