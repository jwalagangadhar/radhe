import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const updateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.any().optional(), // Captured to explicitly reject arbitrary phone modifications
});

export async function GET(req: Request) {
  try {
    const session = await getCustomerSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await prisma.customerUser.findUnique({
      where: { id: session.id },
      include: {
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        },
        orders: {
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              include: { product: true },
            },
            invoice: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        phoneVerified: customer.phoneVerified,
        email: customer.email,
        status: customer.status,
        createdAt: customer.createdAt,
        addresses: customer.addresses,
        orders: customer.orders,
      },
    });
  } catch (err) {
    console.error("[profile GET error]:", err);
    return NextResponse.json({ error: "Failed to fetch profile." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getCustomerSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid profile update data." }, { status: 400 });
    }

    // Security check: Never allow arbitrary phone modifications without OTP verification
    if (parsed.data.phone !== undefined) {
      return NextResponse.json(
        {
          error:
            "Mobile number cannot be changed arbitrarily. Please use the 'Change Mobile Number' verification flow.",
        },
        { status: 400 }
      );
    }

    const updateData: { name?: string; email?: string | null } = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim();
    if (parsed.data.email !== undefined) {
      updateData.email = parsed.data.email ? parsed.data.email.trim().toLowerCase() : null;
    }

    const updated = await prisma.customerUser.update({
      where: { id: session.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        phoneVerified: true,
        email: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      customer: updated,
    });
  } catch (err) {
    console.error("[profile PATCH error]:", err);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
