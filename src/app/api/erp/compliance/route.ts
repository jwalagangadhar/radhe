import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api";
import { generateGstr1Payload, generateEWayBillJson, generateEInvoiceJson } from "@/lib/erp-engine";

export async function GET(req: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "gstr1";
    const invoiceId = searchParams.get("invoiceId");

    const company = (await prisma.companySettings.findFirst({ where: { id: "default" } })) || {
      companyName: "Radhe Wholesale & Retail Traders",
      gstin: "27AAAAA0000A1Z5",
      address: "123 Commercial Market Yard",
      city: "Mumbai",
      state: "Maharashtra",
      stateCode: "27",
    };

    if (type === "ewaybill") {
      if (!invoiceId) return NextResponse.json({ error: "invoiceId required for e-Way Bill" }, { status: 400 });
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { order: { include: { customer: true } }, deliveryChallan: true },
      });
      if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      const payload = generateEWayBillJson(company, invoice, invoice.deliveryChallan);
      return NextResponse.json({ type: "ewaybill", payload });
    }

    if (type === "einvoice") {
      if (!invoiceId) return NextResponse.json({ error: "invoiceId required for e-Invoice" }, { status: 400 });
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { order: { include: { customer: true } } },
      });
      if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      const payload = generateEInvoiceJson(company, invoice);
      return NextResponse.json({ type: "einvoice", payload });
    }

    if (type === "gstr3b") {
      const invoices = await prisma.invoice.findMany();
      const totalTaxable = invoices.reduce((sum, i) => sum + i.totalTaxable, 0);
      const totalCgst = invoices.reduce((sum, i) => sum + i.totalCgst, 0);
      const totalSgst = invoices.reduce((sum, i) => sum + i.totalSgst, 0);
      const totalIgst = invoices.reduce((sum, i) => sum + i.totalIgst, 0);

      const payload = {
        gstin: company.gstin,
        month: new Date().toISOString().substring(0, 7),
        outwardTaxableSupplies: {
          taxableValue: totalTaxable,
          cgst: totalCgst,
          sgst: totalSgst,
          igst: totalIgst,
          totalTax: totalCgst + totalSgst + totalIgst,
        },
        itcAvailable: {
          cgst: 0,
          sgst: 0,
          igst: 0,
        },
      };

      return NextResponse.json({ type: "gstr3b", payload });
    }

    // Default: GSTR-1
    const invoices = await prisma.invoice.findMany({
      include: {
        order: {
          include: {
            customer: true,
            items: { include: { product: true } },
          },
        },
      },
    });

    const payload = generateGstr1Payload(company, invoices);
    return NextResponse.json({ type: "gstr1", payload });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to generate compliance report" }, { status: 500 });
  }
}
