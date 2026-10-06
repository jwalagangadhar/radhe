import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api";

// ─── GET — Recent Cash Bills ──────────────────────────────────────────────────
export async function GET() {
  const auth = await requireAuth(["ADMIN", "WORKER"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const bills = await prisma.order.findMany({
      where: {
        type: "WALK_IN",
        status: "COMPLETED",
        invoice: null, // no GST invoice — pure cash memos only
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        items: { include: { product: true } },
        createdBy: { select: { name: true } },
      },
    });

    return NextResponse.json({ bills });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch cash bills" }, { status: 500 });
  }
}

// ─── POST — Create Cash Memo / Non-GST Bill ──────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAuth(["ADMIN", "WORKER"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const {
      customerName,
      customerPhone,
      paymentMode = "CASH",
      items, // [{ productId, quantity, unitPrice }]
      discountAmount = 0,
      notes,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Bill must contain at least one item." },
        { status: 400 }
      );
    }

    // Validate products exist and have enough stock (handle variant productId strings e.g. prodId-30kg_bag)
    const baseProductIds: string[] = items.map((i: any) => String(i.productId).split("-")[0]);
    const uniqueProductIds = Array.from(new Set(baseProductIds));
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds }, active: true },
    });

    if (products.length !== uniqueProductIds.length) {
      return NextResponse.json(
        { error: "One or more products not found or inactive." },
        { status: 400 }
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Build order items (no GST calculation — prices as-is)
    let grossTotal = 0;
    const orderItems: {
      productId: string;
      hsnCode: string;
      batchNumber: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      gstRate: number;
      cgstAmount: number;
      sgstAmount: number;
      igstAmount: number;
      subtotal: number;
    }[] = [];

    const stockDecrements: { productId: string; decrementAmount: number }[] = [];
    const displayItems: { name: string; unit: string; quantity: number; unitPrice: number; subtotal: number }[] = [];

    for (const item of items) {
      const baseId = String(item.productId).split("-")[0];
      const prod = productMap.get(baseId);
      if (!prod) continue;

      const qty = Number(item.quantity);
      const bagW = prod.bagWeight && prod.bagWeight > 0 ? prod.bagWeight : 30;

      // Extract variant multiplier if variant ID or custom multiplier provided
      let multiplier = 1;
      let itemUnit = prod.unit || "kg";
      let itemName = prod.name;
      const rawVariantPart = String(item.productId).replace(`${baseId}-`, "");
      if (rawVariantPart.endsWith("kg_bag") || rawVariantPart.endsWith("_bag")) {
        multiplier = bagW;
        itemUnit = `Bag (${bagW}kg)`;
        itemName = `${prod.name} (1 Bag - ${bagW}kg)`;
      } else if (rawVariantPart === "250g") {
        multiplier = 0.25;
        itemUnit = "¼ kg (250g)";
        itemName = `${prod.name} (250gm Pack)`;
      } else if (rawVariantPart === "500g") {
        multiplier = 0.5;
        itemUnit = "½ kg (500g)";
        itemName = `${prod.name} (500gm Pack)`;
      } else if (rawVariantPart === "1kg") {
        multiplier = 1;
        itemUnit = "1 kg";
        itemName = `${prod.name} (1kg Pack)`;
      } else if (rawVariantPart === "5kg") {
        multiplier = 5;
        itemUnit = "5 kg";
        itemName = `${prod.name} (5kg Pack)`;
      } else if (item.multiplier && Number(item.multiplier) > 0) {
        multiplier = Number(item.multiplier);
      }

      const effectivePrice = prod.counterPrice ?? prod.price;
      const price = Number(item.unitPrice ?? Math.round(effectivePrice * multiplier * 100) / 100);
      const subtotal = qty * price;
      grossTotal += subtotal;

      orderItems.push({
        productId: prod.id,
        hsnCode: prod.hsnCode || "1006",
        batchNumber: prod.batchNumber || "BATCH-001",
        quantity: qty,
        unitPrice: price,
        discount: 0,
        gstRate: 0, // Non-GST bill
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        subtotal,
      });

      // Stock deduction in base unit (kg, or bags if unit is bag)
      const decrementAmount = prod.unit?.toLowerCase() === "bag" && (rawVariantPart.endsWith("kg_bag") || rawVariantPart.endsWith("_bag"))
        ? qty
        : qty * multiplier;

      stockDecrements.push({ productId: prod.id, decrementAmount });
      displayItems.push({ name: itemName, unit: itemUnit, quantity: qty, unitPrice: price, subtotal });
    }

    const netTotal = Math.max(0, grossTotal - Number(discountAmount));

    // Get next sequential order number
    const maxOrder = await prisma.order.aggregate({ _max: { orderNumber: true } });
    const nextOrderNum = (maxOrder._max.orderNumber ?? 1000) + 1;

    // Create order as COMPLETED (immediate, no pending queue)
    const bill = await prisma.order.create({
      data: {
        orderNumber: nextOrderNum,
        type: "WALK_IN",
        status: "COMPLETED",
        customerName: customerName || "Counter Sale",
        customerPhone: customerPhone || null,
        customerStateCode: "37",
        placeOfSupply: "37-Andhra Pradesh",
        gstNumber: null,
        totalTaxable: grossTotal,
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 0,
        total: netTotal,
        notes: notes
          ? `[${paymentMode}] ${notes}`
          : `[${paymentMode}] Walk-in counter cash bill`,
        createdById: auth.id,
        completedAt: new Date(),
        items: { create: orderItems },
      },
      include: {
        items: { include: { product: true } },
      },
    });

    // Decrement stock immediately based on actual weight / bag multiplier
    for (const dec of stockDecrements) {
      await prisma.product.update({
        where: { id: dec.productId },
        data: { stock: { decrement: dec.decrementAmount } },
      });
    }

    return NextResponse.json(
      {
        message: "Cash memo recorded successfully",
        bill: {
          id: bill.id,
          billNumber: bill.orderNumber,
          customerName: bill.customerName,
          customerPhone: bill.customerPhone,
          paymentMode,
          date: bill.createdAt,
          items: displayItems.length > 0 ? displayItems : bill.items.map((i) => ({
            name: i.product.name,
            quantity: i.quantity,
            unit: i.product.unit,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
          })),
          grossTotal,
          discountAmount: Number(discountAmount),
          netTotal,
          notes: bill.notes,
          // Non-GST: no invoice, no challan — simple cash record only
          invoiceNumber: null,
          challanNumber: null,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to create cash bill" },
      { status: 500 }
    );
  }
}
