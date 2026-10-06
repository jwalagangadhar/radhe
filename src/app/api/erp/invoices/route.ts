import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api";
import { postInvoiceJournalEntry, generateUpiString } from "@/lib/erp-engine";

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          include: {
            items: { include: { product: true } },
            customer: true,
          },
        },
        deliveryChallan: true,
        payments: true,
      },
    });

    return NextResponse.json({ invoices });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { orderId, discountAmount = 0 } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required to generate GST invoice" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If an invoice already exists for this order, return it idempotently
    const existing = await prisma.invoice.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            items: { include: { product: true } },
            customer: true,
          },
        },
      },
    });
    if (existing) {
      return NextResponse.json({ invoice: existing });
    }

    const company = await prisma.companySettings.findFirst({ where: { id: "default" } });
    const isInterState = company?.stateCode !== order.customerStateCode;

    // Generate unique invoice number
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${year}-${(count + 1).toString().padStart(4, "0")}`;

    const taxable = order.totalTaxable;
    const cgst = order.totalCgst;
    const sgst = order.totalSgst;
    const igst = order.totalIgst;
    const gross = taxable + cgst + sgst + igst - Number(discountAmount);
    const grandTotal = Math.round(gross);
    const roundOff = Math.round((grandTotal - gross) * 100) / 100;

    const invoice = await prisma.invoice.create({
      data: {
        orderId: order.id,
        invoiceNumber,
        invoiceDate: new Date(),
        placeOfSupply: order.placeOfSupply,
        isInterState,
        totalTaxable: taxable,
        totalCgst: cgst,
        totalSgst: sgst,
        totalIgst: igst,
        discountAmount: Number(discountAmount),
        roundOff,
        grandTotal,
        paymentStatus: "UNPAID",
      },
      include: {
        order: {
          include: {
            items: { include: { product: true } },
            customer: true,
          },
        },
      },
    });

    // Update order status to INVOICED
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "INVOICED", completedAt: new Date() },
    });

    // Post to Double-Entry Ledger
    await postInvoiceJournalEntry(prisma, {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalTaxable: invoice.totalTaxable,
      totalCgst: invoice.totalCgst,
      totalSgst: invoice.totalSgst,
      totalIgst: invoice.totalIgst,
      grandTotal: invoice.grandTotal,
      customerName: order.customerName || "Customer",
    });

    // Generate UPI Payment URI
    const upiString = generateUpiString(
      company?.upiId || "radhetraders@sbi",
      company?.companyName || "Radhe Traders",
      invoice.grandTotal,
      invoice.invoiceNumber
    );

    return NextResponse.json({
      message: "GST Invoice generated & posted to ledger successfully",
      invoice,
      upiString,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}
