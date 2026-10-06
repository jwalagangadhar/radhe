import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";

const stockAdditionSchema = z.object({
  productId: z.string().min(1),
  bagCount: z.number().int().positive(),
  bagWeight: z.number().positive(),
  note: z.string().optional(),
});

// GET - Admin sees all arrivals (filterable by ?status=); workers see the approved arrivals log
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = req.nextUrl;
  const statusParam = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    let where: Record<string, unknown>;
    if (auth.role === "ADMIN") {
      // Admin can filter by ?status=; default = APPROVED arrivals
      where = statusParam ? { status: statusParam } : { status: "APPROVED" };
    } else {
      // Workers always see the approved arrivals log (read-only)
      where = { status: "APPROVED" };
    }

    const additions = await prisma.stockAddition.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, unit: true, bagWeight: true } },
        worker: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ additions });
  } catch {
    return jsonError("Failed to fetch stock additions", 500);
  }
}

// POST - Admin records truck/warehouse stock arrival (auto-approved, stock updated immediately)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const data = stockAdditionSchema.parse(await req.json());
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      return jsonError("Product not found", 404);
    }

    const totalWeight = data.bagCount * data.bagWeight;

    // Create the stock addition record — auto-approved (admin entry is trusted)
    const addition = await prisma.stockAddition.create({
      data: {
        productId: data.productId,
        workerId: auth.id,
        bagCount: data.bagCount,
        bagWeight: data.bagWeight,
        totalWeight,
        note: data.note,
        status: "APPROVED",
        adminNote: `Truck arrival entered by ${auth.name}`,
        reviewedById: auth.id,
        reviewedAt: new Date(),
      },
      include: { product: { select: { id: true, name: true, unit: true } } },
    });

    // Immediately update product unpackedStock
    await prisma.product.update({
      where: { id: data.productId },
      data: { unpackedStock: { increment: totalWeight } },
    });

    // Create stock adjustment for the audit trail
    await prisma.stockAdjustment.create({
      data: {
        productId: data.productId,
        quantity: totalWeight,
        bagCount: data.bagCount,
        bagWeight: data.bagWeight,
        reason: `Truck arrival (Unpacked) — ${data.bagCount} bags × ${data.bagWeight} kg entered by ${auth.name}${data.note ? ` (${data.note})` : ""}`,
        createdById: auth.id,
      },
    });


    // Notify all active workers that new stock has arrived
    const workers = await prisma.user.findMany({ where: { role: "WORKER", active: true } });
    for (const worker of workers) {
      await prisma.notification.create({
        data: {
          userId: worker.id,
          title: "📦 New Unpacked Stock Arrived",
          message: `${data.bagCount} bags of ${product.name} (${totalWeight} kg total) added to unpacked warehouse stock`,
          type: "STOCK_ADDITION",
          relatedId: addition.id,
        },
      });
    }

    return NextResponse.json(addition, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Invalid request data");
    return jsonError("Failed to create stock addition", 500);
  }
}

// PATCH - Admin can update status of legacy pending records (kept for backward compatibility)
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, status, adminNote } = body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return jsonError("Invalid status");
    }

    const addition = await prisma.stockAddition.findUnique({
      where: { id },
      include: { product: true, worker: true },
    });

    if (!addition) {
      return jsonError("Stock addition not found", 404);
    }

    const updated = await prisma.stockAddition.update({
      where: { id },
      data: {
        status,
        adminNote,
        reviewedById: auth.id,
        reviewedAt: new Date(),
      },
      include: { product: true, worker: { select: { name: true } } },
    });

    // If approving for the first time, update stock
    if (status === "APPROVED" && addition.status !== "APPROVED") {
      const isPackagedUnit = ["bag", "packet", "master bag"].includes(addition.product.unit.toLowerCase());
      const stockIncrement = isPackagedUnit ? addition.bagCount : addition.totalWeight;
      const unpackedTargetId = addition.product.parentId ? addition.product.parentId : addition.productId;

      await prisma.$transaction([
        prisma.product.update({
          where: { id: addition.productId },
          data: { stock: { increment: stockIncrement } },
        }),
        prisma.product.update({
          where: { id: unpackedTargetId },
          data: { unpackedStock: { decrement: addition.totalWeight } },
        })
      ]);

      await prisma.stockAdjustment.create({
        data: {
          productId: addition.productId,
          quantity: addition.totalWeight,
          bagCount: addition.bagCount,
          bagWeight: addition.bagWeight,
          reason: `Approved stock addition from ${addition.worker.name}`,
          createdById: auth.id,
        },
      });

      await prisma.notification.create({
        data: {
          userId: addition.workerId,
          title: "Stock Addition Approved",
          message: `Your ${addition.bagCount} bags of ${addition.product.name} have been approved`,
          type: "STOCK_ADDITION",
          relatedId: id,
        },
      });
    } else if (status === "REJECTED") {
      await prisma.notification.create({
        data: {
          userId: addition.workerId,
          title: "Stock Addition Rejected",
          message: `Your ${addition.bagCount} bags of ${addition.product.name} were rejected${adminNote ? `: ${adminNote}` : ""}`,
          type: "STOCK_ADDITION",
          relatedId: id,
        },
      });
    }

    return NextResponse.json(updated);
  } catch {
    return jsonError("Failed to update stock addition", 500);
  }
}
