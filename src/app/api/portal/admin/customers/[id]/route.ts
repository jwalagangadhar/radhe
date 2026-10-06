import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const updateCustomerSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "BLOCKED"]),
});

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied. Administrator privileges required." }, { status: 403 });
    }

    const { id } = await props.params;
    const body = await req.json();
    const parsed = updateCustomerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }

    const updated = await prisma.customerUser.update({
      where: { id },
      data: { status: parsed.data.status },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Customer account status updated to ${updated.status}.`,
      customer: updated,
    });
  } catch (err) {
    console.error("[admin/customers/[id] PATCH error]:", err);
    return NextResponse.json({ error: "Failed to update customer status." }, { status: 500 });
  }
}
