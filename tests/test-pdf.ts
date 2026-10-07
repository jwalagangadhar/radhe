import { generateInvoicePdf, CompanyInfo, InvoicePdfData } from "@/lib/pdf";

async function main() {
  const company: CompanyInfo = {
    companyName: "Test Company",
    gstin: "12345",
    address: "123 Test St",
    city: "Test City",
    state: "Test State",
    stateCode: "27",
    phone: "1234567890",
    email: "test@example.com",
    pan: "ABCDE1234F",
    bankName: "Test Bank",
    accountNumber: "1234567890",
    ifscCode: "TEST0001234",
    upiId: "test@upi",
    termsAndConditions: "Test terms",
  };

  const invoiceData: InvoicePdfData = {
    invoiceNumber: "INV-001",
    orderNumber: 1,
    invoiceDate: "2023-10-01",
    customerName: "Test Customer",
    customerPhone: "1234567890",
    customerAddress: "Test Address",
    placeOfSupply: "27-Maharashtra",
    isInterState: false,
    totalTaxable: 100,
    totalCgst: 9,
    totalSgst: 9,
    totalIgst: 0,
    totalTax: 18,
    roundOff: 0,
    grandTotal: 118,
    items: [],
  };

  try {
    const buffer = await generateInvoicePdf(company, invoiceData);
    console.log("PDF generated successfully! Size:", buffer.length);
  } catch (err) {
    console.error("Error generating PDF:", err);
  }
}

main();
