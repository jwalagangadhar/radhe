import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database for ERP & Invoicing Platform...");

  // Clear existing data in reverse order of foreign keys
  await prisma.paymentRecord.deleteMany();
  await prisma.journalPosting.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.ledgerAccount.deleteMany();
  await prisma.deliveryChallan.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.companySettings.deleteMany();
  await prisma.stockArrival.deleteMany();
  await prisma.stockAddition.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.stockRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Default Company Settings
  await prisma.companySettings.create({
    data: {
      id: "default",
      companyName: "Radhe Wholesale & Retail Traders",
      gstin: "27AAAAA0000A1Z5",
      address: "123 Commercial Market Yard, Main Gate",
      city: "Mumbai",
      state: "Maharashtra",
      stateCode: "27",
      phone: "+91 9876543210",
      email: "billing@radhetraders.com",
      pan: "AAAAA0000A",
      bankName: "State Bank of India",
      accountNumber: "38472910482",
      ifscCode: "SBIN0001234",
      upiId: "radhetraders@sbi",
      termsAndConditions: "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is delayed beyond due date.\n3. Subject to local jurisdiction only.",
    },
  });

  // 2. Create Users with RBAC roles
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const workerEmail = (process.env.WORKER_EMAIL || "worker@example.com").toLowerCase().trim();
  const workerPassword = process.env.WORKER_PASSWORD || "worker123";

  const hashedAdminPw = await bcrypt.hash(adminPassword, 10);
  const hashedWorkerPw = await bcrypt.hash(workerPassword, 10);

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      email: adminEmail,
      password: hashedAdminPw,
      name: "Rajesh Sharma (Admin)",
      role: "ADMIN",
      phone: "+919876543210",
      active: true,
    },
  });

  const worker = await prisma.user.create({
    data: {
      username: "worker",
      email: workerEmail,
      password: hashedWorkerPw,
      name: "Ramesh Singh (Worker)",
      role: "WORKER",
      phone: "+919876543211",
      active: true,
    },
  });

  const worker1 = await prisma.user.create({
    data: {
      username: "worker1",
      email: "worker1@example.com",
      password: hashedWorkerPw,
      name: "Suresh Kumar (Worker)",
      role: "WORKER",
      phone: "+919876543212",
      active: true,
    },
  });

  console.log(`✅ Users created with RBAC roles (Admin: ${adminEmail}/admin, Worker: ${workerEmail}/worker, Worker1: worker1).`);

  // 3. Create Double-Entry Chart of Accounts
  const ledgerSales = await prisma.ledgerAccount.create({
    data: { code: "4000", name: "Sales Account", group: "REVENUE", balance: 0 },
  });
  const ledgerDebtors = await prisma.ledgerAccount.create({
    data: { code: "1100", name: "Sundry Debtors", group: "ASSET", balance: 0 },
  });
  const ledgerCash = await prisma.ledgerAccount.create({
    data: { code: "1010", name: "Cash in Hand", group: "ASSET", balance: 0 },
  });
  const ledgerBank = await prisma.ledgerAccount.create({
    data: { code: "1020", name: "Bank Account (SBI)", group: "ASSET", balance: 0 },
  });
  const ledgerCgst = await prisma.ledgerAccount.create({
    data: { code: "2110", name: "CGST Payable Account", group: "LIABILITY", balance: 0 },
  });
  const ledgerSgst = await prisma.ledgerAccount.create({
    data: { code: "2120", name: "SGST Payable Account", group: "LIABILITY", balance: 0 },
  });
  const ledgerIgst = await prisma.ledgerAccount.create({
    data: { code: "2130", name: "IGST Payable Account", group: "LIABILITY", balance: 0 },
  });
  const ledgerDiscount = await prisma.ledgerAccount.create({
    data: { code: "5100", name: "Discount Allowed", group: "EXPENSE", balance: 0 },
  });

  console.log("✅ Chart of Accounts initialized.");

  // 4. Create Customers (Intra-state and Inter-state)
  const custIntra = await prisma.customer.create({
    data: {
      name: "Apex Retail Mart",
      phone: "+919820011223",
      email: "accounts@apexretail.com",
      address: "45 MG Road, Dadar West",
      city: "Mumbai",
      state: "Maharashtra",
      stateCode: "27",
      gstNumber: "27APXRT9988A1Z9",
      creditLimit: 100000,
      balance: 18900,
    },
  });

  const custInter = await prisma.customer.create({
    data: {
      name: "Gujarat General Stores",
      phone: "+919898099887",
      email: "contact@gujaratgeneral.in",
      address: "12 Station Road, Navrangpura",
      city: "Ahmedabad",
      state: "Gujarat",
      stateCode: "24",
      gstNumber: "24GUJGS5544B1Z2",
      creditLimit: 150000,
      balance: 28350,
    },
  });

  console.log("✅ Customers created.");

  // 5. Create Products with HSN & GST rates
  // 5. Create Products with HSN & GST rates and Package Weight Variants
  const p1 = await prisma.product.create({
    data: {
      name: "Premium Royal Basmati Rice",
      category: "Rice",
      price: 72, // ₹72 per kg base
      costPrice: 56,
      stock: 500,
      minStock: 25,
      maxStock: 1000,
      bagWeight: 25,
      unit: "kg",
      hsnCode: "10063020",
      gstRate: 5,
      batchNumber: "BATCH-R2026-A1",
      availability: "BOTH",
      active: true,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      name: "Fortune Refined Edible Oil",
      category: "Oils",
      price: 140, // ₹140 per L/kg base
      costPrice: 120,
      stock: 300,
      minStock: 20,
      maxStock: 500,
      bagWeight: 15,
      unit: "kg",
      hsnCode: "15121910",
      gstRate: 5,
      batchNumber: "BATCH-OIL26-04",
      availability: "BOTH",
      active: true,
    },
  });

  const p3 = await prisma.product.create({
    data: {
      name: "Sharbati Whole Wheat Atta",
      category: "Atta & Grains",
      price: 33, // ₹33 per kg base
      costPrice: 26,
      stock: 800,
      minStock: 30,
      maxStock: 1500,
      bagWeight: 50,
      unit: "kg",
      hsnCode: "11010000",
      gstRate: 5,
      batchNumber: "BATCH-ATT26-09",
      availability: "BOTH",
      active: true,
    },
  });

  const p4 = await prisma.product.create({
    data: {
      name: "M-30 Grade Refined Sugar",
      category: "Sweeteners",
      price: 43, // ₹43 per kg base
      costPrice: 38,
      stock: 1000,
      minStock: 40,
      maxStock: 2000,
      bagWeight: 50,
      unit: "kg",
      hsnCode: "17019990",
      gstRate: 5,
      batchNumber: "BATCH-SUG26-02",
      availability: "BOTH",
      active: true,
    },
  });

  const p5 = await prisma.product.create({
    data: {
      name: "Desi Unpolished Toor Dal",
      category: "Dals",
      price: 110, // ₹110 per kg base
      costPrice: 92,
      stock: 600,
      minStock: 20,
      maxStock: 1200,
      bagWeight: 30,
      unit: "kg",
      hsnCode: "07136000",
      gstRate: 5,
      batchNumber: "BATCH-DAL26-01",
      availability: "BOTH",
      active: true,
    },
  });

  console.log("✅ Products created with HSN codes & GST rates.");

  // 6. Create Orders, Invoices, Delivery Challans, and Journal Entries
  // Order 1: Intra-state (CGST 2.5% + SGST 2.5% = 5%)
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 1001,
      type: "WALK_IN",
      status: "INVOICED",
      customerId: custIntra.id,
      customerName: custIntra.name,
      customerPhone: custIntra.phone,
      deliveryAddress: custIntra.address,
      customerStateCode: "27",
      placeOfSupply: "27-Maharashtra",
      gstNumber: custIntra.gstNumber,
      totalTaxable: 18000,
      totalCgst: 450,
      totalSgst: 450,
      totalIgst: 0,
      total: 18900,
      notes: "Urgent morning dispatch",
      createdById: admin.id,
      approvedAt: new Date(),
      items: {
        create: [
          {
            productId: p1.id,
            hsnCode: p1.hsnCode,
            batchNumber: p1.batchNumber,
            quantity: 10,
            unitPrice: 1800,
            gstRate: 5,
            cgstAmount: 450,
            sgstAmount: 450,
            igstAmount: 0,
            subtotal: 18900,
          },
        ],
      },
    },
  });

  const invoice1 = await prisma.invoice.create({
    data: {
      orderId: order1.id,
      invoiceNumber: "INV-2026-0001",
      invoiceDate: new Date(),
      placeOfSupply: "27-Maharashtra",
      isInterState: false,
      totalTaxable: 18000,
      totalCgst: 450,
      totalSgst: 450,
      totalIgst: 0,
      discountAmount: 0,
      roundOff: 0,
      grandTotal: 18900,
      paymentStatus: "PAID",
      paidAmount: 18900,
    },
  });

  await prisma.deliveryChallan.create({
    data: {
      challanNumber: "DC-2026-0001",
      orderId: order1.id,
      invoiceId: invoice1.id,
      transporterName: "VRL Logistics Ltd.",
      lrNumber: "LR-998877",
      vehicleNumber: "MH-04-EK-9821",
      dispatchDate: new Date(),
      destination: "Dadar West, Mumbai",
      distanceKm: 15,
      eWayBillNo: "381002938491",
      status: "DELIVERED",
      notes: "Driver Mob: +91 9123456789",
    },
  });

  // Double entry posting for Invoice 1
  const je1 = await prisma.journalEntry.create({
    data: {
      entryNumber: "JE-2026-0001",
      entryDate: new Date(),
      narration: "Sales Invoice INV-2026-0001 created for Apex Retail Mart",
      referenceType: "INVOICE",
      referenceId: invoice1.id,
      postings: {
        create: [
          { accountId: ledgerDebtors.id, debit: 18900, credit: 0 },
          { accountId: ledgerSales.id, debit: 0, credit: 18000 },
          { accountId: ledgerCgst.id, debit: 0, credit: 450 },
          { accountId: ledgerSgst.id, debit: 0, credit: 450 },
        ],
      },
    },
  });

  // Update ledger account balances
  await prisma.ledgerAccount.update({ where: { id: ledgerDebtors.id }, data: { balance: 18900 } });
  await prisma.ledgerAccount.update({ where: { id: ledgerSales.id }, data: { balance: 18000 } });
  await prisma.ledgerAccount.update({ where: { id: ledgerCgst.id }, data: { balance: 450 } });
  await prisma.ledgerAccount.update({ where: { id: ledgerSgst.id }, data: { balance: 450 } });

  // Record Payment for Invoice 1
  await prisma.paymentRecord.create({
    data: {
      paymentNumber: "PAY-2026-0001",
      invoiceId: invoice1.id,
      orderId: order1.id,
      customerId: custIntra.id,
      amount: 18900,
      paymentMode: "UPI",
      transactionRef: "UPI/394829104/APEX",
      notes: "Full payment received via UPI",
    },
  });

  // Order 2: Inter-state (IGST 5%)
  const order2 = await prisma.order.create({
    data: {
      orderNumber: 1002,
      type: "WEB",
      status: "IN_TRANSIT",
      customerId: custInter.id,
      customerName: custInter.name,
      customerPhone: custInter.phone,
      deliveryAddress: custInter.address,
      customerStateCode: "24",
      placeOfSupply: "24-Gujarat",
      gstNumber: custInter.gstNumber,
      totalTaxable: 27000,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 1350,
      total: 28350,
      notes: "Interstate dispatch via SafeXpress",
      createdById: admin.id,
      approvedAt: new Date(),
      items: {
        create: [
          {
            productId: p3.id,
            hsnCode: p3.hsnCode,
            batchNumber: p3.batchNumber,
            quantity: 10,
            unitPrice: 1650,
            gstRate: 5,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 825,
            subtotal: 17325,
          },
          {
            productId: p2.id,
            hsnCode: p2.hsnCode,
            batchNumber: p2.batchNumber,
            quantity: 5,
            unitPrice: 2100,
            gstRate: 5,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 525,
            subtotal: 11025,
          },
        ],
      },
    },
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      orderId: order2.id,
      invoiceNumber: "INV-2026-0002",
      invoiceDate: new Date(),
      placeOfSupply: "24-Gujarat",
      isInterState: true,
      totalTaxable: 27000,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 1350,
      discountAmount: 0,
      roundOff: 0,
      grandTotal: 28350,
      paymentStatus: "UNPAID",
      paidAmount: 0,
    },
  });

  await prisma.deliveryChallan.create({
    data: {
      challanNumber: "DC-2026-0002",
      orderId: order2.id,
      invoiceId: invoice2.id,
      transporterName: "SafeXpress Freight",
      lrNumber: "SFX-8839201",
      vehicleNumber: "GJ-01-AB-1234",
      dispatchDate: new Date(),
      destination: "Ahmedabad, Gujarat",
      distanceKm: 520,
      eWayBillNo: "882001928374",
      status: "IN_TRANSIT",
      notes: "Driver Contact: +91 9898989898",
    },
  });

  // Double entry posting for Invoice 2
  await prisma.journalEntry.create({
    data: {
      entryNumber: "JE-2026-0002",
      entryDate: new Date(),
      narration: "Sales Invoice INV-2026-0002 created for Gujarat General Stores",
      referenceType: "INVOICE",
      referenceId: invoice2.id,
      postings: {
        create: [
          { accountId: ledgerDebtors.id, debit: 28350, credit: 0 },
          { accountId: ledgerSales.id, debit: 0, credit: 27000 },
          { accountId: ledgerIgst.id, debit: 0, credit: 1350 },
        ],
      },
    },
  });

  console.log("🎉 Complete ERP database seed finished successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
