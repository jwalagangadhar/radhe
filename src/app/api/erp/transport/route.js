import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api";
export async function GET() {
    const auth = await requireAuth(["ADMIN", "WORKER"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        const challans = await prisma.deliveryChallan.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                order: { include: { customer: true, items: { include: { product: true } } } },
                invoice: true,
            },
        });
        return NextResponse.json({ challans });
    }
    catch (error) {
        return NextResponse.json({ error: "Failed to fetch delivery challans" }, { status: 500 });
    }
}
export async function POST(req) {
    const auth = await requireAuth(["ADMIN", "WORKER"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        const body = await req.json();
        const { orderId, invoiceId, transporterName, lrNumber, vehicleNumber, dispatchDate, destination, distanceKm = 10, eWayBillNo, notes, } = body;
        if (!orderId || !transporterName || !lrNumber || !vehicleNumber || !destination) {
            return NextResponse.json({ error: "orderId, transporterName, lrNumber, vehicleNumber, and destination are required." }, { status: 400 });
        }
        const count = await prisma.deliveryChallan.count();
        const year = new Date().getFullYear();
        const challanNumber = `DC-${year}-${(count + 1).toString().padStart(4, "0")}`;
        const newChallan = await prisma.deliveryChallan.create({
            data: {
                challanNumber,
                orderId,
                invoiceId,
                transporterName,
                lrNumber,
                vehicleNumber,
                dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
                destination,
                distanceKm: Number(distanceKm),
                eWayBillNo,
                status: "IN_TRANSIT",
                notes,
            },
            include: {
                order: true,
                invoice: true,
            },
        });
        // Update order status to IN_TRANSIT if pending/approved
        await prisma.order.update({
            where: { id: orderId },
            data: { status: "IN_TRANSIT" },
        });
        return NextResponse.json({
            message: "Delivery Challan created successfully",
            challan: newChallan,
        });
    }
    catch (error) {
        return NextResponse.json({ error: "Failed to create Delivery Challan" }, { status: 500 });
    }
}
