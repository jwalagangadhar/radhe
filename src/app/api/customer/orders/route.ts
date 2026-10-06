import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await getCustomerSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: session.id },
          // Backward compatibility if order was placed with matching phone before userId link
          { customerPhone: session.phone },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
                image: true,
                category: true,
              },
            },
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            paymentStatus: true,
            grandTotal: true,
          },
        },
        deliveryChallan: {
          select: {
            id: true,
            challanNumber: true,
            status: true,
            transporterName: true,
            lrNumber: true,
            vehicleNumber: true,
            dispatchDate: true,
          },
        },
      },
    });

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("[customer/orders GET error]:", err);
    return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
  }
}
