export {};

async function verify() {
  const BASE_URL = "http://localhost:3000";

  try {
    await fetch(`${BASE_URL}/api/products`);
  } catch {
    console.warn("⚠️  DEVELOPMENT SERVER NOT RUNNING AT " + BASE_URL);
    console.log("👉 Please start the server with 'npm run dev' before executing admin billing tests.\n");
    return;
  }

  // 1. Login as admin
  console.log("1. Logging in as admin...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "admin", password: "admin123" }),
  });
  const loginData = await loginRes.json();
  const cookie = loginRes.headers.get("set-cookie") || "";
  console.log("Admin login status:", loginRes.status, "role:", loginData.user?.role);
  if (loginRes.status !== 200 || loginData.user?.role !== "ADMIN") {
    throw new Error("Admin login failed");
  }

  // 2. Fetch /portal/admin/cash-counter
  console.log("\n2. Checking /portal/admin/cash-counter...");
  const cashRes = await fetch(`${BASE_URL}/portal/admin/cash-counter`, {
    headers: { cookie },
  });
  console.log("/portal/admin/cash-counter status:", cashRes.status);
  const cashText = await cashRes.text();
  if (cashRes.status !== 200) {
    throw new Error("Cash counter page failed to load");
  }
  console.log("✅ /portal/admin/cash-counter loaded with 200 OK!");

  // 3. Fetch /portal/admin/take-order
  console.log("\n3. Checking /portal/admin/take-order...");
  const takeRes = await fetch(`${BASE_URL}/portal/admin/take-order`, {
    headers: { cookie },
  });
  console.log("/portal/admin/take-order status:", takeRes.status);
  const takeText = await takeRes.text();
  if (takeRes.status !== 200) {
    throw new Error("Take order page failed to load");
  }
  console.log("✅ /portal/admin/take-order loaded with 200 OK!");

  // 4. Fetch /portal/admin/orders
  console.log("\n4. Checking /portal/admin/orders...");
  const ordersRes = await fetch(`${BASE_URL}/portal/admin/orders`, {
    headers: { cookie },
  });
  console.log("/portal/admin/orders status:", ordersRes.status);
  const ordersText = await ordersRes.text();
  if (ordersRes.status !== 200) {
    throw new Error("Orders page failed to load");
  }
  console.log("✅ /portal/admin/orders loaded cleanly!");

  console.log("\n🎉 ALL ADMIN PORTAL BILLING & ORDER PAGES VERIFIED SUCCESSFULLY!");
}

verify().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
