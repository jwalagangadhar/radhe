import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";
import { sendCustomerInvoiceSms } from "@/lib/notifications";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN", "WORKER"]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
    },
  });

  if (!order) {
    return jsonError("Order not found", 404);
  }

  if (!order.customerPhone) {
    return jsonError("Customer phone number is required to send SMS", 400);
  }

  const result = await sendCustomerInvoiceSms(order);
  return NextResponse.json({ success: true, result });
}
