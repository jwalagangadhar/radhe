import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";

const createSchema = z.object({
  productId: z.string(),
  bagCount: z.number().int().min(1),
  bagWeight: z.number().positive(),
  channel: z.enum(["NON_GST", "GST", "WEB"]).default("NON_GST"),
  packageType: z.string().optional(),
  note: z.string().optional(),
});

const reviewSchema = z.object({
  id: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["ADMIN", "WORKER"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: Prisma.StockRequestWhereInput = {};
  if (status) {
    where.status = status as "PENDING" | "APPROVED" | "REJECTED";
  }
  if (auth.role === "WORKER") {
    where.workerId = auth.id;
  }

  const requests = await prisma.stockRequest.findMany({
    where,
    include: {
      product: true,
      worker: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["ADMIN", "WORKER"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      include: { parent: true },
    });

    if (!product) {
      return jsonError("Product not found", 404);
    }

    // Retail packets (such as 1 kg Non-GST packs) do not require wholesale minimum bag limits
    const isRetailNonGst = data.channel === "NON_GST" && data.bagWeight <= 5;
    if (!isRetailNonGst) {
      if (data.bagCount < product.minBulkBags) {
        return jsonError(`Minimum limit is ${product.minBulkBags} bags for wholesale packaging`, 1200);
      }
      if (data.bagCount > product.maxBulkBags) {
        return jsonError(`Maximum limit is ${product.maxBulkBags} bags for wholesale packaging`, 1200);
      }
    }

    const bagWeight = data.bagWeight;
    const totalWeight = data.bagCount * bagWeight;

    const unpackedStockTarget = product.parentId ? product.parentId : product.id;
    const targetUnpackedStock = product.parentId ? product.parent!.unpackedStock : product.unpackedStock;

    // Reserve unpacked bulk as soon as the worker submits the request.
    if (targetUnpackedStock < totalWeight) {
      return jsonError("Insufficient unpacked stock. Only " + targetUnpackedStock + " " + product.unit + " of unpacked stock is available to pack.", 400);
    }
    // Check capacity limit check if needed
    if (product.stock + totalWeight > product.maxStock) {
      return jsonError(`Adding this will exceed max stock limit of ${product.maxStock} ${product.unit}`, 400);
    }

    const channelTag = `[${data.channel}:${data.packageType || (data.bagWeight <= 1 ? "1kg_pack" : "wholesale_bag")}]`;
    const formattedNote = data.note ? `${channelTag} ${data.note.trim()}` : channelTag;

    const request = await prisma.$transaction(async (tx) => {
      const reserved = await tx.product.updateMany({
        where: {
          id: unpackedStockTarget,
          unpackedStock: { gte: totalWeight },
        },
        data: {
          unpackedStock: { decrement: totalWeight },
        },
      });

      if (reserved.count !== 1) {
        throw new Error("INSUFFICIENT_UNPACKED_STOCK");
      }

      const createdRequest = await tx.stockRequest.create({
        data: {
          productId: product.id,
          workerId: auth.id,
          bagCount: data.bagCount,
          bagWeight,
          totalWeight,
          note: formattedNote,
          status: "PENDING",
        },
        include: {
          product: true,
        },
      });

      await tx.stockAdjustment.create({
        data: {
          productId: product.id,
          quantity: -totalWeight,
          bagCount: data.bagCount,
          bagWeight,
          reason: `Unpacked bulk reserved for ${data.channel} packing: ${data.bagCount}x${bagWeight}kg`,
          createdById: auth.id,
        },
      });

      return createdRequest;
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.errors[0]?.message ?? "Invalid stock request data");
    }
    if (err instanceof Error && err.message === "INSUFFICIENT_UNPACKED_STOCK") {
      return jsonError("Insufficient unpacked stock. Another request used the available bulk.", 400);
    }
    return jsonError("Failed to submit stock request", 1200);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const data = reviewSchema.parse(body);

    const existing = await prisma.stockRequest.findUnique({
      where: { id: data.id },
      include: { product: true },
    });

    if (!existing) {
      return jsonError("Stock request not found", 404);
    }

    if (existing.status !== "PENDING") {
      return jsonError("This request has already been reviewed", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.stockRequest.update({
        where: { id: data.id },
        data: {
          status: data.status,
          adminNote: data.adminNote,
          reviewedAt: new Date(),
        },
      });

      if (data.status === "APPROVED") {
        const isPackagedUnit = ["bag", "packet", "master bag"].includes(existing.product.unit.toLowerCase());
        const stockIncrement = isPackagedUnit ? existing.bagCount : existing.totalWeight;

        // The unpacked bulk was reserved when the worker submitted the request.
        await tx.product.update({
          where: { id: existing.productId },
          data: {
            stock: { increment: stockIncrement },
          },
        });

        await tx.stockAdjustment.create({
          data: {
            productId: existing.productId,
            quantity: existing.totalWeight,
            bagCount: existing.bagCount,
            bagWeight: existing.bagWeight,
            reason: "Packed bags approved from reserved unpacked bulk: " + (existing.note || "No note"),
            createdById: auth.id,
          },
        });
      } else {
        // Return the reserved bulk when an admin rejects the request.
        const targetId = existing.product.parentId ? existing.product.parentId : existing.productId;
        await tx.product.update({
          where: { id: targetId },
          data: {
            unpackedStock: { increment: existing.totalWeight },
          },
        });

        await tx.stockAdjustment.create({
          data: {
            productId: existing.productId,
            quantity: existing.totalWeight,
            bagCount: existing.bagCount,
            bagWeight: existing.bagWeight,
            reason: "Rejected worker packing request: released reserved unpacked bulk",
            createdById: auth.id,
          },
        });
      }
      return updated;
    });

    return NextResponse.json({ request: result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.errors[0]?.message ?? "Invalid review data");
    }
    if (err instanceof Error && err.message === "INSUFFICIENT_UNPACKED_STOCK") {
      return jsonError("Insufficient unpacked stock. Another request used the available bulk.", 400);
    }
    return jsonError("Failed to process stock request", 400);
  }
}
