import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts } from "pdf-lib";
function formatPdfCurrency(amount: number): string {
  return "Rs. " + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type CompanyInfo = {
  companyName: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  phone: string;
  email: string;
  pan: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  termsAndConditions: string;
};

export type InvoicePdfItem = {
  description: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  total: number;
};

export type InvoicePdfData = {
  invoiceNumber: string;
  orderNumber: number;
  invoiceDate: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  placeOfSupply: string;
  isInterState: boolean;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  items: InvoicePdfItem[];
  gstNumber?: string;
  qrCodeBase64?: string;
  challan?: ChallanPdfData;
};

export type ChallanPdfData = {
  challanNumber: string;
  orderNumber: number;
  dispatchDate: string;
  transporterName: string;
  lrNumber: string;
  vehicleNumber: string;
  destination: string;
  distanceKm: number;
  eWayBillNo?: string;
  notes?: string;
  customerName: string;
  deliveryAddress: string;
};

function decodeBase64Data(value: string): Uint8Array {
  const parts = value.includes(",") ? value.split(",") : ["", value];
  return Buffer.from(parts[parts.length - 1], "base64");
}

function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = rgb(0, 0, 0)) {
  page.drawText(text, { x, y, size, font, color, maxWidth: 520 });
}

async function renderHeader(page: PDFPage, company: CompanyInfo, copyLabel: string, fonts: { regular: PDFFont; bold: PDFFont }) {
  drawText(page, company.companyName, 40, 780, fonts.bold, 16);
  drawText(page, `GSTIN: ${company.gstin}`, 40, 760, fonts.regular, 10);
  drawText(page, `${company.address}, ${company.city}, ${company.state}`, 40, 746, fonts.regular, 10);
  drawText(page, `Phone: ${company.phone} | Email: ${company.email}`, 40, 732, fonts.regular, 10);
  drawText(page, copyLabel, 380, 780, fonts.regular, 10);
}

function renderMetadata(page: PDFPage, data: InvoicePdfData, fonts: { regular: PDFFont; bold: PDFFont }) {
  let y = 700;
  drawText(page, "TAX INVOICE", 230, y, fonts.bold, 12);
  y -= 18;

  const lines = [
    `Invoice Number: ${data.invoiceNumber}`,
    `Order Number: ${data.orderNumber}`,
    `Invoice Date: ${data.invoiceDate}`,
    `Customer: ${data.customerName}`,
    `Phone: ${data.customerPhone}`,
    `Address: ${data.customerAddress}`,
    `Place of Supply: ${data.placeOfSupply}`,
  ];

  if (data.gstNumber) {
    lines.push(`GSTIN: ${data.gstNumber}`);
  }

  for (const line of lines) {
    drawText(page, line, 40, y, fonts.regular, 9);
    y -= 14;
  }
}

function renderItems(page: PDFPage, items: InvoicePdfItem[], fonts: { regular: PDFFont; bold: PDFFont }) {
  let y = 560;
  const x = [40, 180, 260, 320, 400, 470];

  drawText(page, "Description", x[0], y, fonts.bold, 9);
  drawText(page, "HSN", x[1], y, fonts.bold, 9);
  drawText(page, "Qty", x[2], y, fonts.bold, 9);
  drawText(page, "Taxable", x[3], y, fonts.bold, 9);
  drawText(page, "GST", x[4], y, fonts.bold, 9);
  drawText(page, "Total", x[5], y, fonts.bold, 9);
  y -= 16;

  for (const item of items) {
    drawText(page, item.description, x[0], y, fonts.regular, 8);
    drawText(page, item.hsnCode, x[1], y, fonts.regular, 8);
    drawText(page, String(item.quantity), x[2], y, fonts.regular, 8);
    drawText(page, formatPdfCurrency(item.taxableValue), x[3], y, fonts.regular, 8);
    drawText(page, formatPdfCurrency(item.cgstAmount + item.sgstAmount + item.igstAmount), x[4], y, fonts.regular, 8);
    drawText(page, formatPdfCurrency(item.total), x[5], y, fonts.regular, 8);
    y -= 14;
  }
}

function renderSummary(page: PDFPage, data: InvoicePdfData, fonts: { regular: PDFFont; bold: PDFFont }) {
  let y = 220;
  drawText(page, "Summary", 40, y, fonts.bold, 10);
  y -= 16;
  drawText(page, `Taxable Amount: ${formatPdfCurrency(data.totalTaxable)}`, 40, y, fonts.regular, 9);
  y -= 12;
  drawText(page, `CGST: ${formatPdfCurrency(data.totalCgst)}`, 40, y, fonts.regular, 9);
  y -= 12;
  drawText(page, `SGST: ${formatPdfCurrency(data.totalSgst)}`, 40, y, fonts.regular, 9);
  y -= 12;
  drawText(page, `IGST: ${formatPdfCurrency(data.totalIgst)}`, 40, y, fonts.regular, 9);
  y -= 12;
  drawText(page, `Total GST: ${formatPdfCurrency(data.totalTax)}`, 40, y, fonts.regular, 9);
  y -= 12;
  drawText(page, `Round off: ${formatPdfCurrency(data.roundOff)}`, 40, y, fonts.regular, 9);
  y -= 14;
  drawText(page, `Grand Total: ${formatPdfCurrency(data.grandTotal)}`, 40, y, fonts.bold, 10);
}

async function renderFooter(page: PDFPage, company: CompanyInfo, data: InvoicePdfData, fonts: { regular: PDFFont; bold: PDFFont }, qrImage?: any) {
  let y = 120;
  drawText(page, company.termsAndConditions, 40, y, fonts.regular, 8);
  y -= 38;
  drawText(page, "Payment QR / Reference", 40, y, fonts.bold, 10);
  y -= 18;

  if (qrImage) {
    page.drawImage(qrImage, { x: 40, y: y - 120, width: 120, height: 120 });
    y -= 130;
  }

  drawText(page, `Invoice Ref: ${data.invoiceNumber}`, 40, y, fonts.regular, 9);
  y -= 12;
  drawText(page, `Order Ref: ${data.orderNumber}`, 40, y, fonts.regular, 9);
}

function renderChallanPage(page: PDFPage, company: CompanyInfo, challan: ChallanPdfData, fonts: { regular: PDFFont; bold: PDFFont }) {
  let y = 780;
  drawText(page, company.companyName, 40, y, fonts.bold, 16);
  y -= 24;
  drawText(page, `Delivery Challan: ${challan.challanNumber}`, 40, y, fonts.bold, 12);
  y -= 18;

  const lines = [
    `Order Number: ${challan.orderNumber}`,
    `Dispatch Date: ${challan.dispatchDate}`,
    `Transporter: ${challan.transporterName}`,
    `LR / TR Number: ${challan.lrNumber}`,
    `Vehicle Number: ${challan.vehicleNumber}`,
    `Destination: ${challan.destination}`,
  ];

  if (challan.eWayBillNo) lines.push(`E-Way Bill No: ${challan.eWayBillNo}`);
  lines.push("", "Delivery Details", `Customer: ${challan.customerName}`, `Delivery Address: ${challan.deliveryAddress}`);
  if (challan.notes) lines.push(`Notes: ${challan.notes}`);
  lines.push("", company.termsAndConditions);

  for (const line of lines) {
    const size = line === "Delivery Details" ? 10 : 9;
    drawText(page, line, 40, y, fonts.regular, size);
    y -= 14;
  }
}

export async function generateInvoicePdf(company: CompanyInfo, data: InvoicePdfData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };
  const qrImage = data.qrCodeBase64 ? await pdfDoc.embedPng(decodeBase64Data(data.qrCodeBase64)) : undefined;

  const addInvoicePage = async (copyLabel: string) => {
    const page = pdfDoc.addPage([595, 842]);
    await renderHeader(page, company, copyLabel, fonts);
    renderMetadata(page, data, fonts);
    renderItems(page, data.items, fonts);
    renderSummary(page, data, fonts);
    await renderFooter(page, company, data, fonts, qrImage);
  };

  await addInvoicePage("Original Copy — Recipient");
  await addInvoicePage("Duplicate Copy — Transporter");
  await addInvoicePage("Triplicate Copy — Supplier");

  const receiptPage = pdfDoc.addPage([595, 842]);
  await renderHeader(receiptPage, company, "Digital Order Slip", fonts);
  renderMetadata(receiptPage, data, fonts);
  drawText(receiptPage, "This is a mobile-friendly order receipt generated for customer reference.", 40, 420, fonts.regular, 10);
  renderItems(receiptPage, data.items, fonts);
  renderSummary(receiptPage, data, fonts);
  await renderFooter(receiptPage, company, data, fonts, qrImage);

  if (data.challan) {
    const challanPage = pdfDoc.addPage([595, 842]);
    renderChallanPage(challanPage, company, data.challan, fonts);
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function generateDeliveryChallanPdf(company: CompanyInfo, challan: ChallanPdfData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };
  const page = pdfDoc.addPage([595, 842]);
  renderChallanPage(page, company, challan, fonts);
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
