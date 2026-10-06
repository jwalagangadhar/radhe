import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";

const createSchema = z.object({
  productId: z.string(),
  supplierName: z.string().min(1),
  totalWeight: z.number().positive(),
  costPerUnit: z.number().nonnegative(),
  vehicleNumber: z.string().optional(),
  note: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["ADMIN", "WORKER"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const arrivals = await prisma.stockArrival.findMany({
      include: {
        product: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json({ arrivals });
  } catch (err) {
    return jsonError("Failed to fetch arrivals", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      return jsonError("Product not found", 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create the arrival record
      const arrival = await tx.stockArrival.create({
        data: {
          productId: data.productId,
          supplierName: data.supplierName,
          totalWeight: data.totalWeight,
          costPerUnit: data.costPerUnit,
          vehicleNumber: data.vehicleNumber,
          note: data.note,
          createdById: auth.id,
        },
      });

      // Increment unpacked stock on the product
      await tx.product.update({
        where: { id: data.productId },
        data: {
          unpackedStock: { increment: data.totalWeight },
        },
      });

      return arrival;
    });

    return NextResponse.json({ arrival: result }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.errors[0]?.message ?? "Invalid arrival data", 400);
    }
    return jsonError("Failed to create stock arrival", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonError("Missing arrival ID", 400);
    }

    const arrival = await prisma.stockArrival.findUnique({
      where: { id },
    });

    if (!arrival) {
      return jsonError("Stock arrival not found", 404);
    }

    if (arrival.usedWeight > 0) {
      return jsonError("Cannot delete an arrival that has already been packed from", 400);
    }

    await prisma.$transaction(async (tx) => {
      // Delete the arrival
      await tx.stockArrival.delete({
        where: { id },
      });

      // Decrement unpacked stock
      await tx.product.update({
        where: { id: arrival.productId },
        data: {
          unpackedStock: { decrement: arrival.totalWeight },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return jsonError("Failed to delete stock arrival", 500);
  }
}
