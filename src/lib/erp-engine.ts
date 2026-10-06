import { PrismaClient } from "@prisma/client";

export interface GstItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  gstRate: number; // e.g. 5, 12, 18, 28
  hsnCode: string;
  batchNumber?: string;
}

export interface GstCalculationResult {
  isInterState: boolean;
  placeOfSupply: string;
  items: Array<{
    productId: string;
    hsnCode: string;
    batchNumber?: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    taxableValue: number;
    gstRate: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    subtotal: number;
  }>;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  subtotalWithTax: number;
  roundOff: number;
  grandTotal: number;
  hsnSummary: Array<{
    hsnCode: string;
    taxableValue: number;
    gstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalTax: number;
  }>;
}

/**
 * Perform precise GST tax calculation according to Indian GST Rules
 */
export function calculateGst(
  items: GstItemInput[],
  supplierStateCode: string = "27",
  customerStateCode: string = "27"
): GstCalculationResult {
  const isInterState = supplierStateCode.trim() !== customerStateCode.trim();
  const placeOfSupply = `${customerStateCode}-State`;

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const hsnMap = new Map<string, { taxableValue: number; gstRate: number; cgstAmount: number; sgstAmount: number; igstAmount: number }>();

  const processedItems = items.map((item) => {
    const gross = item.quantity * item.unitPrice;
    const discountAmount = gross * ((item.discountPercent || 0) / 100);
    const taxableValue = Math.round((gross - discountAmount) * 100) / 100;

    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isInterState) {
      igstRate = item.gstRate;
      igstAmount = Math.round((taxableValue * (igstRate / 100)) * 100) / 100;
    } else {
      cgstRate = item.gstRate / 2;
      sgstRate = item.gstRate / 2;
      cgstAmount = Math.round((taxableValue * (cgstRate / 100)) * 100) / 100;
      sgstAmount = Math.round((taxableValue * (sgstRate / 100)) * 100) / 100;
    }

    const itemSubtotal = taxableValue + cgstAmount + sgstAmount + igstAmount;

    totalTaxable += taxableValue;
    totalCgst += cgstAmount;
    totalSgst += sgstAmount;
    totalIgst += igstAmount;

    // HSN aggregation
    const existing = hsnMap.get(item.hsnCode) || {
      taxableValue: 0,
      gstRate: item.gstRate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
    };
    existing.taxableValue += taxableValue;
    existing.cgstAmount += cgstAmount;
    existing.sgstAmount += sgstAmount;
    existing.igstAmount += igstAmount;
    hsnMap.set(item.hsnCode, existing);

    return {
      productId: item.productId,
      hsnCode: item.hsnCode,
      batchNumber: item.batchNumber,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount,
      taxableValue,
      gstRate: item.gstRate,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      subtotal: Math.round(itemSubtotal * 100) / 100,
    };
  });

  const totalTax = Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100;
  const rawGrandTotal = totalTaxable + totalTax;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

  const hsnSummary = Array.from(hsnMap.entries()).map(([hsnCode, val]) => ({
    hsnCode,
    taxableValue: Math.round(val.taxableValue * 100) / 100,
    gstRate: val.gstRate,
    cgstAmount: Math.round(val.cgstAmount * 100) / 100,
    sgstAmount: Math.round(val.sgstAmount * 100) / 100,
    igstAmount: Math.round(val.igstAmount * 100) / 100,
    totalTax: Math.round((val.cgstAmount + val.sgstAmount + val.igstAmount) * 100) / 100,
  }));

  return {
    isInterState,
    placeOfSupply,
    items: processedItems,
    totalTaxable: Math.round(totalTaxable * 100) / 100,
    totalCgst: Math.round(totalCgst * 100) / 100,
    totalSgst: Math.round(totalSgst * 100) / 100,
    totalIgst: Math.round(totalIgst * 100) / 100,
    totalTax,
    subtotalWithTax: rawGrandTotal,
    roundOff,
    grandTotal,
    hsnSummary,
  };
}

/**
 * Generate UPI QR Code URL string for instant dynamic payments
 */
export function generateUpiString(upiId: string, companyName: string, amount: number, invoiceRef: string): string {
  const encodedName = encodeURIComponent(companyName);
  return `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount.toFixed(2)}&tr=${invoiceRef}&tn=Payment%20for%20${invoiceRef}&cu=INR`;
}

/**
 * Generate Double-Entry Journal Postings for an Invoice
 */
export async function postInvoiceJournalEntry(
  prisma: PrismaClient,
  invoice: {
    id: string;
    invoiceNumber: string;
    totalTaxable: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    grandTotal: number;
    customerName?: string;
  }
) {
  const debtorsAcc = await prisma.ledgerAccount.findUnique({ where: { code: "1100" } });
  const salesAcc = await prisma.ledgerAccount.findUnique({ where: { code: "4000" } });
  const cgstAcc = await prisma.ledgerAccount.findUnique({ where: { code: "2110" } });
  const sgstAcc = await prisma.ledgerAccount.findUnique({ where: { code: "2120" } });
  const igstAcc = await prisma.ledgerAccount.findUnique({ where: { code: "2130" } });

  if (!debtorsAcc || !salesAcc) return null;

  const entryNumber = `JE-INV-${invoice.invoiceNumber}`;

  const existing = await prisma.journalEntry.findUnique({ where: { entryNumber } });
  if (existing) return existing;

  const postingsData: Array<{ accountId: string; debit: number; credit: number }> = [
    { accountId: debtorsAcc.id, debit: invoice.grandTotal, credit: 0 },
    { accountId: salesAcc.id, debit: 0, credit: invoice.totalTaxable },
  ];

  if (invoice.totalCgst > 0 && cgstAcc) {
    postingsData.push({ accountId: cgstAcc.id, debit: 0, credit: invoice.totalCgst });
  }
  if (invoice.totalSgst > 0 && sgstAcc) {
    postingsData.push({ accountId: sgstAcc.id, debit: 0, credit: invoice.totalSgst });
  }
  if (invoice.totalIgst > 0 && igstAcc) {
    postingsData.push({ accountId: igstAcc.id, debit: 0, credit: invoice.totalIgst });
  }

  const journalEntry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      entryDate: new Date(),
      narration: `Sales Invoice ${invoice.invoiceNumber} for ${invoice.customerName || "Customer"}`,
      referenceType: "INVOICE",
      referenceId: invoice.id,
      postings: {
        create: postingsData,
      },
    },
  });

  // Update balances
  await prisma.ledgerAccount.update({ where: { id: debtorsAcc.id }, data: { balance: { increment: invoice.grandTotal } } });
  await prisma.ledgerAccount.update({ where: { id: salesAcc.id }, data: { balance: { increment: invoice.totalTaxable } } });
  if (invoice.totalCgst > 0 && cgstAcc) {
    await prisma.ledgerAccount.update({ where: { id: cgstAcc.id }, data: { balance: { increment: invoice.totalCgst } } });
  }
  if (invoice.totalSgst > 0 && sgstAcc) {
    await prisma.ledgerAccount.update({ where: { id: sgstAcc.id }, data: { balance: { increment: invoice.totalSgst } } });
  }
  if (invoice.totalIgst > 0 && igstAcc) {
    await prisma.ledgerAccount.update({ where: { id: igstAcc.id }, data: { balance: { increment: invoice.totalIgst } } });
  }

  return journalEntry;
}

export async function postPaymentReceiptJournalEntry(
  prisma: PrismaClient,
  payment: {
    invoiceId: string;
    paymentAmount: number;
    paymentMode: string;
    transactionRef?: string;
  }
) {
  const debtorsAcc = await prisma.ledgerAccount.findUnique({ where: { code: "1100" } });
  const cashAcc = await prisma.ledgerAccount.findUnique({ where: { code: "1010" } });
  const bankAcc = await prisma.ledgerAccount.findUnique({ where: { code: "1020" } });

  if (!debtorsAcc || (!cashAcc && !bankAcc)) return null;

  const account = payment.paymentMode === "CASH" ? cashAcc : bankAcc || cashAcc;
  if (!account) return null;

  const entryNumber = `JE-PAY-${payment.invoiceId}-${payment.transactionRef ?? Date.now()}`;
  const existing = await prisma.journalEntry.findUnique({ where: { entryNumber } });
  if (existing) return existing;

  const journalEntry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      entryDate: new Date(),
      narration: `Payment received for invoice ${payment.invoiceId}`,
      referenceType: "PAYMENT",
      referenceId: payment.invoiceId,
      postings: {
        create: [
          { accountId: account.id, debit: payment.paymentAmount, credit: 0 },
          { accountId: debtorsAcc.id, debit: 0, credit: payment.paymentAmount },
        ],
      },
    },
  });

  await prisma.ledgerAccount.update({ where: { id: account.id }, data: { balance: { increment: payment.paymentAmount } } });
  await prisma.ledgerAccount.update({ where: { id: debtorsAcc.id }, data: { balance: { decrement: payment.paymentAmount } } });

  return journalEntry;
}

/**
 * Generate GSTR-1 JSON Payload Schema
 */
export function generateGstr1Payload(company: any, invoices: any[]) {
  const b2bInvoices = invoices.filter((inv) => inv.order?.gstNumber);
  const b2csInvoices = invoices.filter((inv) => !inv.order?.gstNumber);

  return {
    gstin: company.gstin,
    fp: `${new Date().getMonth() + 1}${new Date().getFullYear()}`,
    b2b: b2bInvoices.map((inv) => ({
      ctin: inv.order?.gstNumber,
      inv: [
        {
          inum: inv.invoiceNumber,
          idt: inv.invoiceDate.toISOString().split("T")[0],
          val: inv.grandTotal,
          pos: inv.placeOfSupply.substring(0, 2),
          rchrg: "N",
          inv_typ: "R",
          itms: [
            {
              num: 1,
              itm_det: {
                rt: inv.isInterState ? Math.round((inv.totalIgst / (inv.totalTaxable || 1)) * 100) : Math.round(((inv.totalCgst * 2) / (inv.totalTaxable || 1)) * 100),
                txval: inv.totalTaxable,
                iamt: inv.totalIgst,
                camt: inv.totalCgst,
                samt: inv.totalSgst,
                csamt: 0,
              },
            },
          ],
        },
      ],
    })),
    b2cs: b2csInvoices.map((inv) => ({
      sply_ty: inv.isInterState ? "INTER" : "INTRA",
      rt: 5.0,
      typ: "OE",
      pos: inv.placeOfSupply.substring(0, 2),
      txval: inv.totalTaxable,
      iamt: inv.totalIgst,
      camt: inv.totalCgst,
      samt: inv.totalSgst,
    })),
    hsn: {
      hsn_det: invoices.flatMap((inv) =>
        (inv.order?.items || []).map((item: any) => ({
          hsn_sc: item.hsnCode || "1006",
          desc: item.product?.name || "Grocery Goods",
          uqc: item.product?.unit?.toUpperCase() || "KGS",
          qty: item.quantity,
          val: item.subtotal,
          txval: item.quantity * item.unitPrice,
          iamt: item.igstAmount,
          camt: item.cgstAmount,
          samt: item.sgstAmount,
        }))
      ),
    },
  };
}

/**
 * Generate Government e-Way Bill JSON Payload
 */
export function generateEWayBillJson(company: any, invoice: any, challan: any) {
  return {
    supplyType: "O",
    subSupplyType: "1",
    docType: "INV",
    docNo: invoice.invoiceNumber,
    docDate: invoice.invoiceDate.toISOString().split("T")[0],
    fromGstin: company.gstin,
    fromTrdName: company.companyName,
    fromAddr1: company.address,
    fromPlace: company.city,
    fromPincode: 400001,
    actFromStateCode: Number(company.stateCode),
    toGstin: invoice.order?.gstNumber || "URP",
    toTrdName: invoice.order?.customerName || "Customer",
    toAddr1: challan?.destination || invoice.order?.deliveryAddress || "Destination",
    toPlace: company.city,
    toPincode: 400002,
    actToStateCode: Number(invoice.order?.customerStateCode || "27"),
    totalValue: invoice.totalTaxable,
    cgstValue: invoice.totalCgst,
    sgstValue: invoice.totalSgst,
    igstValue: invoice.totalIgst,
    totInvValue: invoice.grandTotal,
    transporterId: "123456789012",
    transporterName: challan?.transporterName || "VRL Transport",
    transDocNo: challan?.lrNumber || "LR-100",
    transMode: "1",
    transDistance: challan?.distanceKm || 15,
    vehicleNo: challan?.vehicleNumber || "MH-04-AB-1234",
    vehicleType: "R",
  };
}

/**
 * Generate NIC e-Invoice IRN JSON Payload
 */
export function generateEInvoiceJson(company: any, invoice: any) {
  return {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: "B2B",
      RegRev: "N",
      IgstOnIntra: "N",
    },
    DocDtls: {
      Typ: "INV",
      No: invoice.invoiceNumber,
      Dt: invoice.invoiceDate.toISOString().split("T")[0],
    },
    SellerDtls: {
      Gstin: company.gstin,
      LglNm: company.companyName,
      TrdNm: company.companyName,
      Addr1: company.address,
      Loc: company.city,
      Pin: 400001,
      Stcd: company.stateCode,
    },
    BuyerDtls: {
      Gstin: invoice.order?.gstNumber || "27APXRT9988A1Z9",
      LglNm: invoice.order?.customerName || "Customer",
      Pos: invoice.order?.customerStateCode || "27",
      Addr1: invoice.order?.deliveryAddress || "Address",
      Loc: company.city,
      Pin: 400002,
      Stcd: invoice.order?.customerStateCode || "27",
    },
    ValDtls: {
      AssVal: invoice.totalTaxable,
      CgstVal: invoice.totalCgst,
      SgstVal: invoice.totalSgst,
      IgstVal: invoice.totalIgst,
      RndOffAmt: invoice.roundOff,
      TotInvVal: invoice.grandTotal,
    },
  };
}
