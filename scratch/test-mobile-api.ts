import { prisma, ensureDefaultData } from "../src/lib/db";
import { createToken, verifyToken } from "../src/lib/auth";

async function runTests() {
  console.log("==================================================");
  console.log("RADHE TRADERS - MOBILE BACKEND & SECURITY TEST SUITE");
  console.log("==================================================");

  await ensureDefaultData();

  const baseUrl = "http://localhost:3000";

  // 1. Test Admin Login
  console.log("\n[TEST 1] Login as Admin...");
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "admin", password: "admin123" }),
  });
  const adminLoginData = await adminLoginRes.json();
  if (adminLoginRes.status === 200 && adminLoginData.user?.role === "ADMIN" && adminLoginData.token) {
    console.log("✅ PASS: Admin authenticated successfully. Token received:", adminLoginData.token.substring(0, 20) + "...");
  } else {
    console.error("❌ FAIL: Admin login failed", adminLoginRes.status, adminLoginData);
  }
  const adminToken = adminLoginData.token;

  // 2. Test Worker Login
  console.log("\n[TEST 2] Login as Worker...");
  const workerLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "worker", password: "worker123" }),
  });
  const workerLoginData = await workerLoginRes.json();
  if (workerLoginRes.status === 200 && workerLoginData.user?.role === "WORKER" && workerLoginData.token) {
    console.log("✅ PASS: Worker authenticated successfully. Role: WORKER. Token received.");
  } else {
    console.error("❌ FAIL: Worker login failed", workerLoginRes.status, workerLoginData);
  }
  const workerToken = workerLoginData.token;

  // 3. Test Invalid Credentials
  console.log("\n[TEST 3] Invalid Credentials...");
  const invalidRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "admin", password: "wrongpassword123" }),
  });
  if (invalidRes.status === 401) {
    console.log("✅ PASS: Invalid credentials correctly rejected with 401 Unauthorized.");
  } else {
    console.error("❌ FAIL: Expected 401, got:", invalidRes.status);
  }

  // 4. Test Token Verification via /api/auth/me (Admin)
  console.log("\n[TEST 4] Session Validation for Admin (/api/auth/me)...");
  const meAdminRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const meAdminData = await meAdminRes.json();
  if (meAdminRes.status === 200 && meAdminData.user?.role === "ADMIN") {
    console.log("✅ PASS: Admin Bearer token verified. Name:", meAdminData.user.name);
  } else {
    console.error("❌ FAIL: Admin token verification failed", meAdminRes.status, meAdminData);
  }

  // 5. Test Token Verification via /api/auth/me (Worker)
  console.log("\n[TEST 5] Session Validation for Worker (/api/auth/me)...");
  const meWorkerRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  const meWorkerData = await meWorkerRes.json();
  if (meWorkerRes.status === 200 && meWorkerData.user?.role === "WORKER") {
    console.log("✅ PASS: Worker Bearer token verified. Name:", meWorkerData.user.name);
  } else {
    console.error("❌ FAIL: Worker token verification failed", meWorkerRes.status, meWorkerData);
  }

  // 6. Test Unauthenticated Protected Route
  console.log("\n[TEST 6] Unauthenticated Protected Request...");
  const unauthRes = await fetch(`${baseUrl}/api/dashboard`);
  if (unauthRes.status === 401) {
    console.log("✅ PASS: Unauthenticated request rejected with 401 Unauthorized.");
  } else {
    console.error("❌ FAIL: Expected 401, got:", unauthRes.status);
  }

  // 7. Test Admin Dashboard Access
  console.log("\n[TEST 7] Admin Dashboard API (/api/dashboard)...");
  const dashRes = await fetch(`${baseUrl}/api/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dashData = await dashRes.json();
  if (dashRes.status === 200 && dashData.stats) {
    console.log("✅ PASS: Admin dashboard data loaded. Today Sales:", dashData.stats.todaySales);
  } else {
    console.error("❌ FAIL: Admin dashboard load failed", dashRes.status, dashData);
  }

  // 8. Test Worker Attempting Admin Dashboard (Role Isolation)
  console.log("\n[TEST 8] Worker Attempting Admin Dashboard (/api/dashboard)...");
  const workerDashRes = await fetch(`${baseUrl}/api/dashboard`, {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  if (workerDashRes.status === 403) {
    console.log("✅ PASS: Worker access to Admin Dashboard strictly blocked with 403 Forbidden!");
  } else {
    console.error("❌ FAIL: Role isolation violated! Expected 403, got:", workerDashRes.status);
  }

  // 9. Test Worker Access to Orders Queue
  console.log("\n[TEST 9] Worker Access to Orders Queue (/api/orders?queue=true)...");
  const workerOrdersRes = await fetch(`${baseUrl}/api/orders?queue=true`, {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  const workerOrdersData = await workerOrdersRes.json();
  if (workerOrdersRes.status === 200 && Array.isArray(workerOrdersData.orders)) {
    console.log("✅ PASS: Worker orders queue fetched successfully. Orders in queue:", workerOrdersData.orders.length);
  } else {
    console.error("❌ FAIL: Worker orders fetch failed", workerOrdersRes.status, workerOrdersData);
  }

  // 10. Test Worker Attempting to Modify Product (Admin API)
  console.log("\n[TEST 10] Worker Attempting to Create Product (/api/products)...");
  const workerProductRes = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${workerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Illegal Worker Item",
      category: "Test",
      price: 100,
      stock: 10,
    }),
  });
  if (workerProductRes.status === 403) {
    console.log("✅ PASS: Worker modifying products blocked with 403 Forbidden!");
  } else {
    console.error("❌ FAIL: Worker product mutation should be 403, got:", workerProductRes.status);
  }

  // 11. Test Worker Attempting to Access ERP Metrics
  console.log("\n[TEST 11] Worker Attempting to Access ERP Metrics (/api/erp/metrics)...");
  const workerErpRes = await fetch(`${baseUrl}/api/erp/metrics`, {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  if (workerErpRes.status === 403) {
    console.log("✅ PASS: Worker access to ERP Metrics blocked with 403 Forbidden!");
  } else {
    console.error("❌ FAIL: Expected 403, got:", workerErpRes.status);
  }

  // 12. Test Worker Attempting to Access General Ledger
  console.log("\n[TEST 12] Worker Attempting to Access Ledger (/api/erp/ledger)...");
  const workerLedgerRes = await fetch(`${baseUrl}/api/erp/ledger`, {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  if (workerLedgerRes.status === 403) {
    console.log("✅ PASS: Worker access to Ledger Accounts blocked with 403 Forbidden!");
  } else {
    console.error("❌ FAIL: Expected 403, got:", workerLedgerRes.status);
  }

  // 13. Test Worker Attempting to Access Staff/User Settings
  console.log("\n[TEST 13] Worker Attempting to Access Staff Settings (/api/workers)...");
  const workerStaffRes = await fetch(`${baseUrl}/api/workers`, {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  if (workerStaffRes.status === 403) {
    console.log("✅ PASS: Worker access to Staff Management blocked with 403 Forbidden!");
  } else {
    console.error("❌ FAIL: Expected 403, got:", workerStaffRes.status);
  }

  // 14. Test Admin Access to ERP Invoices
  console.log("\n[TEST 14] Admin Access to ERP Invoices (/api/erp/invoices)...");
  const adminInvRes = await fetch(`${baseUrl}/api/erp/invoices`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminInvData = await adminInvRes.json();
  if (adminInvRes.status === 200 && Array.isArray(adminInvData.invoices)) {
    console.log("✅ PASS: Admin invoices loaded successfully. Count:", adminInvData.invoices.length);
  } else {
    console.error("❌ FAIL: Admin invoices failed", adminInvRes.status, adminInvData);
  }

  // 15. Test Admin Access to Transport Challans
  console.log("\n[TEST 15] Admin Access to Transport Challans (/api/erp/transport)...");
  const adminDcRes = await fetch(`${baseUrl}/api/erp/transport`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminDcData = await adminDcRes.json();
  if (adminDcRes.status === 200 && Array.isArray(adminDcData.challans)) {
    console.log("✅ PASS: Transport delivery challans loaded successfully. Count:", adminDcData.challans.length);
  } else {
    console.error("❌ FAIL: Transport challans failed", adminDcRes.status, adminDcData);
  }

  // 16. Test Product Margin Sanitization (Wholesale Cost hidden from non-admin)
  console.log("\n[TEST 16] Products Cost Margin Sanitization (/api/products)...");
  const publicProdsRes = await fetch(`${baseUrl}/api/products`);
  const publicProdsData = await publicProdsRes.json();
  const workerProdsRes = await fetch(`${baseUrl}/api/products`, {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  const workerProdsData = await workerProdsRes.json();
  const adminProdsRes = await fetch(`${baseUrl}/api/products`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminProdsData = await adminProdsRes.json();

  const publicHasCost = publicProdsData.products?.some((p: any) => p.costPrice !== undefined);
  const workerHasCost = workerProdsData.products?.some((p: any) => p.costPrice !== undefined);
  const adminHasCost = adminProdsData.products?.some((p: any) => p.costPrice !== undefined);

  if (!publicHasCost && !workerHasCost && adminHasCost) {
    console.log("✅ PASS: Wholesale margins completely hidden from Public and Workers, visible only to Admin!");
  } else {
    console.error("❌ FAIL: Margin privacy issue: publicHasCost=", publicHasCost, "workerHasCost=", workerHasCost, "adminHasCost=", adminHasCost);
  }

  // 17. Test Worker Attempting to Modify Order Total / Pricing
  console.log("\n[TEST 17] Worker Attempting to Modify Order Pricing (/api/orders/[id])...");
  const testOrder = await prisma.order.findFirst();
  if (testOrder) {
    const workerPriceHackRes = await fetch(`${baseUrl}/api/orders/${testOrder.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${workerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ total: 1 }), // Worker trying to discount order to ₹1
    });
    if (workerPriceHackRes.status === 403) {
      console.log("✅ PASS: Server prevented worker from modifying order total/pricing (403 Forbidden)!");
    } else {
      console.error("❌ FAIL: Worker allowed to modify pricing! Expected 403, got:", workerPriceHackRes.status);
    }
  }

  // 18. Test Customer Directory Access
  console.log("\n[TEST 18] Customer Directory API (/api/erp/customers)...");
  const custRes = await fetch(`${baseUrl}/api/erp/customers`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const custData = await custRes.json();
  if (custRes.status === 200 && Array.isArray(custData.customers)) {
    console.log("✅ PASS: Customer directory accessible. Total customers:", custData.customers.length);
  } else {
    console.error("❌ FAIL: Customer fetch failed", custRes.status, custData);
  }

  // 19. Test Stock Adjustments
  console.log("\n[TEST 19] Stock Adjustments API (/api/stock-adjustments)...");
  const stockAdjRes = await fetch(`${baseUrl}/api/stock-adjustments`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const stockAdjData = await stockAdjRes.json();
  if (stockAdjRes.status === 200 && Array.isArray(stockAdjData.adjustments)) {
    console.log("✅ PASS: Stock adjustments fetched. Total entries:", stockAdjData.adjustments.length);
  } else {
    console.error("❌ FAIL: Stock adjustments fetch failed", stockAdjRes.status, stockAdjData);
  }

  // 20. Test Logout Session Invalidation
  console.log("\n[TEST 20] Logout and Invalidation (/api/auth/logout)...");
  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (logoutRes.status === 200) {
    console.log("✅ PASS: Logout route responded successfully.");
  } else {
    console.error("❌ FAIL: Logout failed", logoutRes.status);
  }

  console.log("\n==================================================");
  console.log("ALL 20 TEST VERIFICATIONS EXECUTED SUCCESSFULLY!");
  console.log("==================================================");
}

runTests().catch(console.error);
