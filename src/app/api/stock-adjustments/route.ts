import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";

const createAdjustmentSchema = z.object({
  productId: z.string(),
  quantity: z.number(), // Negative for scrap/loss, Positive for manual add
  bagCount: z.number().optional(),
  bagWeight: z.number().optional(),
  reason: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["ADMIN", "WORKER"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const adjustments = await prisma.stockAdjustment.findMany({
      include: {
        product: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });
    return NextResponse.json({ adjustments });
  } catch (err) {
    return jsonError("Failed to fetch stock adjustments", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const data = createAdjustmentSchema.parse(body);

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      return jsonError("Product not found", 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Record adjustment
      const adjustment = await tx.stockAdjustment.create({
        data: {
          productId: data.productId,
          quantity: data.quantity,
          bagCount: data.bagCount,
          bagWeight: data.bagWeight,
          reason: data.reason,
          createdById: auth.id,
        },
      });

      // Update unpacked stock if reason mentions raw/spill, else packed stock
      if (data.reason.toLowerCase().includes("unpacked") || data.reason.toLowerCase().includes("spill") || data.reason.toLowerCase().includes("arrival")) {
        await tx.product.update({
          where: { id: data.productId },
          data: {
            unpackedStock: { increment: data.quantity },
          },
        });
      } else {
        await tx.product.update({
          where: { id: data.productId },
          data: {
            stock: { increment: data.quantity },
          },
        });
      }

      return adjustment;
    });

    return NextResponse.json({ adjustment: result }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.errors[0]?.message ?? "Invalid adjustment data", 400);
    }
    return jsonError("Failed to record stock adjustment", 500);
  }
}
