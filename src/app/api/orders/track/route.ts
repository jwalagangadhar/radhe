import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumberStr = searchParams.get("orderNumber");
    const phoneStr = searchParams.get("phone");

    if (!orderNumberStr) {
      return jsonError("Order number is required", 400);
    }

    const orderNumber = parseInt(orderNumberStr, 10);
    if (isNaN(orderNumber)) {
      return jsonError("Invalid order number format", 400);
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                unit: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return jsonError("Order not found", 404);
    }

    // Require phone verification to protect customer privacy and prevent order enumeration
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    if (!session) {
      if (!phoneStr) {
        return jsonError("Phone number is required to verify order access", 400);
      }
      const cleanPhone = phoneStr.replace(/\D/g, "");
      const orderPhone = order.customerPhone ? order.customerPhone.replace(/\D/g, "") : "";
      if (cleanPhone.slice(-10) !== orderPhone.slice(-10)) {
        return jsonError("Phone number does not match order records", 403);
      }
    }

    // Mask name for privacy if requested publicly without phone verification
    const maskName = (name: string | null) => {
      if (!name) return "Guest Customer";
      const parts = name.split(" ");
      return parts.map(part => part[0] + "*".repeat(Math.max(0, part.length - 1))).join(" ");
    };

    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        customerName: phoneStr ? order.customerName : maskName(order.customerName),
        createdAt: order.createdAt,
        approvedAt: order.approvedAt,
        completedAt: order.completedAt,
        total: order.total,
        type: order.type,
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unit: item.product.unit,
          price: item.unitPrice,
          subtotal: item.subtotal,
          image: item.product.image,
        })),
      },
    });
  } catch (err) {
    console.error("Tracking API Error:", err);
    return jsonError("Failed to fetch order tracking information", 500);
  }
}
