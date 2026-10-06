import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const addressUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().min(10).max(15).optional(),
  address: z.string().min(5).max(300).optional(),
  city: z.string().min(2).max(60).optional(),
  state: z.string().min(2).max(60).optional(),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits").optional(),
  isDefault: z.boolean().optional(),
});

export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCustomerSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;

    const existing = await prisma.customerAddress.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== session.id) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }

    const body = await req.json();
    const parsed = addressUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid address data.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    if (parsed.data.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { userId: session.id },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.customerAddress.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({
      success: true,
      message: "Address updated successfully.",
      address: updated,
    });
  } catch (err) {
    console.error("[addresses/[id] PUT error]:", err);
    return NextResponse.json({ error: "Failed to update address." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCustomerSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;

    const existing = await prisma.customerAddress.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== session.id) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }

    await prisma.customerAddress.delete({
      where: { id },
    });

    // If deleted address was default, set the latest remaining address as default
    if (existing.isDefault) {
      const nextDefault = await prisma.customerAddress.findFirst({
        where: { userId: session.id },
        orderBy: { createdAt: "desc" },
      });
      if (nextDefault) {
        await prisma.customerAddress.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Address deleted successfully." });
  } catch (err) {
    console.error("[addresses/[id] DELETE error]:", err);
    return NextResponse.json({ error: "Failed to delete address." }, { status: 500 });
  }
}
