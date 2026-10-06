import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const addressSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(10).max(15),
  address: z.string().min(5).max(300),
  city: z.string().min(2).max(60),
  state: z.string().min(2).max(60),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  isDefault: z.boolean().optional().default(false),
});

export async function GET(req: Request) {
  try {
    const session = await getCustomerSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const addresses = await prisma.customerAddress.findMany({
      where: { userId: session.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ addresses });
  } catch (err) {
    console.error("[addresses GET error]:", err);
    return NextResponse.json({ error: "Failed to fetch addresses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCustomerSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = addressSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid address data.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const existingCount = await prisma.customerAddress.count({
      where: { userId: session.id },
    });

    const isFirst = existingCount === 0;
    const shouldBeDefault = isFirst || parsed.data.isDefault;

    if (shouldBeDefault) {
      await prisma.customerAddress.updateMany({
        where: { userId: session.id },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.customerAddress.create({
      data: {
        userId: session.id,
        name: parsed.data.name.trim(),
        phone: parsed.data.phone.trim(),
        address: parsed.data.address.trim(),
        city: parsed.data.city.trim(),
        state: parsed.data.state.trim(),
        pincode: parsed.data.pincode.trim(),
        isDefault: shouldBeDefault,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Address saved successfully.",
      address: newAddress,
    });
  } catch (err) {
    console.error("[addresses POST error]:", err);
    return NextResponse.json({ error: "Failed to save address." }, { status: 500 });
  }
}
