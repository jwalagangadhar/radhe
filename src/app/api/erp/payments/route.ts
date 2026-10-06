import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api";

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const payments = await prisma.paymentRecord.findMany({
      orderBy: { paymentDate: "desc" },
      include: {
        invoice: true,
        order: true,
        customer: true,
      },
    });

    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { invoiceId, orderId, customerId, amount, paymentMode = "CASH", transactionRef, notes } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 });
    }

    const count = await prisma.paymentRecord.count();
    const year = new Date().getFullYear();
    const paymentNumber = `PAY-${year}-${(count + 1).toString().padStart(4, "0")}`;

    const payment = await prisma.paymentRecord.create({
      data: {
        paymentNumber,
        invoiceId,
        orderId,
        customerId,
        amount: Number(amount),
        paymentMode,
        transactionRef,
        notes,
      },
    });

    // If linked to invoice, update invoice payment status
    if (invoiceId) {
      const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (inv) {
        const newPaid = inv.paidAmount + Number(amount);
        const newStatus = newPaid >= inv.grandTotal ? "PAID" : "PARTIAL";
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: newPaid,
            paymentStatus: newStatus,
          },
        });
      }
    }

    // If linked to customer, decrement customer balance
    if (customerId) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { balance: { decrement: Number(amount) } },
      });
    }

    // Ledger posting for payment receipt (Debit Cash/Bank, Credit Sundry Debtors)
    const debtorsAcc = await prisma.ledgerAccount.findUnique({ where: { code: "1100" } });
    const cashAcc = await prisma.ledgerAccount.findUnique({ where: { code: paymentMode === "CASH" ? "1010" : "1020" } });

    if (debtorsAcc && cashAcc) {
      const je = await prisma.journalEntry.create({
        data: {
          entryNumber: `JE-${paymentNumber}`,
          entryDate: new Date(),
          narration: `Payment Receipt ${paymentNumber} via ${paymentMode}`,
          referenceType: "PAYMENT",
          referenceId: payment.id,
          postings: {
            create: [
              { accountId: cashAcc.id, debit: Number(amount), credit: 0 },
              { accountId: debtorsAcc.id, debit: 0, credit: Number(amount) },
            ],
          },
        },
      });

      await prisma.ledgerAccount.update({ where: { id: cashAcc.id }, data: { balance: { increment: Number(amount) } } });
      await prisma.ledgerAccount.update({ where: { id: debtorsAcc.id }, data: { balance: { decrement: Number(amount) } } });
    }

    return NextResponse.json({
      message: "Payment recorded and posted to double-entry ledger successfully",
      payment,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
