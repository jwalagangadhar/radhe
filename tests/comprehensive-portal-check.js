import { prisma } from "../src/lib/db";
import { SignJWT } from "jose";
async function runComprehensiveVerification() {
    console.log("==========================================================================");
    console.log("    COMPREHENSIVE END-TO-END PORTAL & MOBILE OTP AUDIT & VERIFICATION    ");
    console.log("==========================================================================");
    const BASE_URL = "http://localhost:3000";
    // Check if server is running
    try {
        await fetch(`${BASE_URL}/api/products`);
    }
    catch {
        console.warn("\n⚠️  DEVELOPMENT SERVER NOT RUNNING AT " + BASE_URL);
        console.log("👉 Please start the server with 'npm run dev' before executing end-to-end HTTP tests.\n");
        return;
    }
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    function assertTest(name, condition, detail) {
        totalTests++;
        if (condition) {
            console.log(`  [PASS] ${name}${detail ? ` (${detail})` : ""}`);
            passedTests++;
        }
        else {
            console.error(`  [FAIL] ${name}${detail ? ` - Detail: ${detail}` : ""}`);
            failedTests++;
        }
    }
    // ==========================================================================
    // SECTION 1: CUSTOMER MOBILE NUMBER & OTP AUTHENTICATION (FULL HTTP LIFECYCLE)
    // ==========================================================================
    console.log("\n--- SECTION 1: Customer Mobile OTP Authentication System ---");
    const testMobile = "9876543999";
    const normalizedMobile = "+919876543999";
    // Clean prior test records
    await prisma.otpVerification.deleteMany({ where: { phone: normalizedMobile } });
    await prisma.customerUser.deleteMany({ where: { phone: normalizedMobile } });
    // 1.1 Invalid mobile format rejection
    const badMobileRes = await fetch(`${BASE_URL}/api/customer/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "12345", countryCode: "+91", purpose: "LOGIN" }),
    });
    const badMobileData = await badMobileRes.json();
    assertTest("1.1 Rejects invalid mobile number", badMobileRes.status === 400 && !badMobileData.success);
    // 1.2 Send OTP to valid mobile
    const sendRes = await fetch(`${BASE_URL}/api/customer/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testMobile, countryCode: "+91", purpose: "LOGIN" }),
    });
    const sendData = await sendRes.json();
    assertTest("1.2 Send OTP HTTP Endpoint", sendRes.status === 200 && sendData.success === true, `Cooldown: ${sendData.cooldownSeconds}s`);
    // 1.3 Cooldown enforcement on rapid resend
    const rapidResend = await fetch(`${BASE_URL}/api/customer/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testMobile, countryCode: "+91", purpose: "LOGIN" }),
    });
    const rapidData = await rapidResend.json();
    assertTest("1.3 Rapid Resend Blocked by Cooldown", rapidResend.status === 429 && rapidData.code === "COOLDOWN_ACTIVE");
    // Retrieve hash from DB to safely extract test OTP in test environment
    // In development, the simulation logs or we can re-hash to find which OTP was generated
    // Or query the otpVerification record directly
    const otpRecord = await prisma.otpVerification.findFirst({
        where: { phone: normalizedMobile, purpose: "LOGIN" },
        orderBy: { createdAt: "desc" },
    });
    assertTest("1.4 DB contains hashed OTP (NO plaintext)", !!otpRecord && otpRecord.otpHash.length === 64);
    // 1.5 Brute-force verification testing (wrong code)
    const wrongVerify = await fetch(`${BASE_URL}/api/customer/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testMobile, otp: "000000", countryCode: "+91", purpose: "LOGIN" }),
    });
    const wrongData = await wrongVerify.json();
    assertTest("1.5 Rejects wrong OTP with remaining attempts", wrongVerify.status === 400 && wrongData.remainingAttempts === 4);
    // For verifying correct OTP in test script: create an OTP entry with known test code "789123"
    const { hashOtp } = await import("../src/lib/otp-service");
    const knownOtp = "789123";
    const knownHash = hashOtp(normalizedMobile, knownOtp);
    await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { otpHash: knownHash, attempts: 0 },
    });
    // 1.6 Successful OTP verification & account creation
    const verifyRes = await fetch(`${BASE_URL}/api/customer/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testMobile, otp: knownOtp, countryCode: "+91", purpose: "LOGIN" }),
    });
    const setCookie = verifyRes.headers.get("set-cookie") || "";
    const verifyData = await verifyRes.json();
    const hasCustomerSessionCookie = setCookie.includes("radhe_customer_session=");
    assertTest("1.6 Verify OTP succeeds & issues HTTP-only session cookie", verifyRes.status === 200 && verifyData.success && hasCustomerSessionCookie);
    // Extract session cookie value
    const cookieMatch = setCookie.match(/radhe_customer_session=([^;]+)/);
    const customerSessionCookie = cookieMatch ? `radhe_customer_session=${cookieMatch[1]}` : "";
    // 1.7 Access Customer Auth Profile (/api/customer/auth/me)
    const meRes = await fetch(`${BASE_URL}/api/customer/auth/me`, {
        headers: { Cookie: customerSessionCookie },
    });
    const meData = await meRes.json();
    assertTest("1.7 Fetch Authenticated Customer Profile (/api/customer/auth/me)", meRes.status === 200 && meData.user?.phone === normalizedMobile);
    // 1.8 Unauthenticated request to /api/customer/auth/me is rejected
    const unauthMe = await fetch(`${BASE_URL}/api/customer/auth/me`);
    assertTest("1.8 Unauthenticated request rejected with 401", unauthMe.status === 401);
    // 1.9 Customer Logout
    const logoutRes = await fetch(`${BASE_URL}/api/customer/auth/logout`, {
        method: "POST",
        headers: { Cookie: customerSessionCookie },
    });
    const logoutCookie = logoutRes.headers.get("set-cookie") || "";
    assertTest("1.9 Customer Logout clears session cookie", logoutRes.status === 200 && (logoutCookie.includes("radhe_customer_session=;") || logoutCookie.includes("Max-Age=0")));
    // ==========================================================================
    // SECTION 2: CUSTOMER STOREFRONT & CHECKOUT PROTECTION
    // ==========================================================================
    console.log("\n--- SECTION 2: Customer Storefront & Checkout Protection ---");
    // 2.1 Public storefront pages
    const storefrontPages = [
        { path: "/", label: "Homepage" },
        { path: "/products", label: "Wholesale Catalog" },
        { path: "/cart", label: "Shopping Cart" },
        { path: "/about", label: "About Us" },
        { path: "/track", label: "Track Order" },
        { path: "/login", label: "Customer OTP Login Screen" },
    ];
    for (const page of storefrontPages) {
        const res = await fetch(`${BASE_URL}${page.path}`);
        assertTest(`2.1 Storefront: ${page.label} (${page.path})`, res.status === 200);
    }
    // 2.2 Checkout page renders
    const checkoutPageRes = await fetch(`${BASE_URL}/checkout`);
    assertTest("2.2 Checkout Page HTTP Status", checkoutPageRes.status === 200);
    // 2.3 Unauthenticated checkout order placement MUST be rejected
    const unauthOrderRes = await fetch(`${BASE_URL}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            customerName: "Anonymous Guest",
            customerPhone: "9999999999",
            items: [{ productId: "test", quantity: 1 }],
        }),
    });
    assertTest("2.3 Anonymous order placement rejected with 401/403", unauthOrderRes.status === 401 || unauthOrderRes.status === 403);
    // ==========================================================================
    // SECTION 3: STAFF & WORKER PORTAL
    // ==========================================================================
    console.log("\n--- SECTION 3: Staff & Worker Portal ---");
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "radhe-grocery-change-this-in-production");
    const workerToken = await new SignJWT({ id: "worker-1", username: "worker", role: "WORKER", name: "Radhe Worker" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("8h")
        .sign(secret);
    const workerCookie = `radhe_session=${workerToken}`;
    // 3.1 Portal Login Page
    const portalLoginRes = await fetch(`${BASE_URL}/portal/login`);
    assertTest("3.1 Staff Portal Login Page (/portal/login)", portalLoginRes.status === 200);
    // 3.2 Worker portal routes
    const workerRoutes = [
        { path: "/portal/worker/queue", label: "Order Dispatch Queue" },
        { path: "/portal/worker/quick-order", label: "Worker Quick Order" },
        { path: "/portal/worker/stock", label: "Stock Counter" },
        { path: "/portal/worker/history", label: "Dispatch History" },
    ];
    for (const r of workerRoutes) {
        const res = await fetch(`${BASE_URL}${r.path}`, {
            headers: { Cookie: workerCookie },
        });
        assertTest(`3.2 Worker Portal: ${r.label} (${r.path})`, res.status === 200);
    }
    // 3.3 Worker forbidden from Admin portal
    const workerToAdminRes = await fetch(`${BASE_URL}/portal/admin`, {
        headers: { Cookie: workerCookie },
        redirect: "manual",
    });
    assertTest("3.3 Worker accessing Admin redirected/denied", workerToAdminRes.status === 307 || workerToAdminRes.status === 403);
    // ==========================================================================
    // SECTION 4: ADMIN ERP PORTAL
    // ==========================================================================
    console.log("\n--- SECTION 4: Admin ERP Portal ---");
    const adminToken = await new SignJWT({ id: "admin-1", username: "admin", role: "ADMIN", name: "Radhe Admin" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("8h")
        .sign(secret);
    const adminCookie = `radhe_session=${adminToken}`;
    const adminRoutes = [
        { path: "/portal/admin", label: "Admin Executive Dashboard" },
        { path: "/portal/admin/orders", label: "Orders Management" },
        { path: "/portal/admin/customers", label: "Customer Directory & OTP Logins" },
        { path: "/portal/admin/inventory", label: "Inventory & Catalog Master" },
        { path: "/portal/admin/cash-counter", label: "Cash Register & POS" },
        { path: "/portal/admin/arrivals", label: "Supplier Stock Arrivals" },
        { path: "/portal/admin/stock-requests", label: "Stock Procurement Requests" },
        { path: "/portal/admin/take-order", label: "In-Store / Phone Order Taking" },
        { path: "/portal/admin/quick-order", label: "Admin Quick Order" },
        { path: "/portal/admin/settings", label: "ERP System Settings" },
    ];
    for (const r of adminRoutes) {
        const res = await fetch(`${BASE_URL}${r.path}`, {
            headers: { Cookie: adminCookie },
        });
        assertTest(`4.1 Admin Portal: ${r.label} (${r.path})`, res.status === 200);
    }
    // ==========================================================================
    // SECTION 5: AI CALLING SYSTEM PURGE VERIFICATION
    // ==========================================================================
    console.log("\n--- SECTION 5: AI Calling System Purge Verification ---");
    const purgeChecks = [
        { path: "/portal/admin/agent", label: "AI Calling Dashboard Page" },
        { path: "/api/voice/call", label: "Voice Call Initiation API" },
        { path: "/api/voice/webhook", label: "Voice Webhook Endpoint" },
        { path: "/api/voice/token", label: "Voice Token API" },
    ];
    for (const p of purgeChecks) {
        const res = await fetch(`${BASE_URL}${p.path}`, {
            headers: { Cookie: adminCookie },
        });
        // Should be 404 Not Found
        assertTest(`5.1 Removed Route: ${p.label} (${p.path}) returns 404`, res.status === 404, `Status: ${res.status}`);
    }
    // ==========================================================================
    // SUMMARY
    // ==========================================================================
    console.log("\n==========================================================================");
    console.log(`FINAL RESULT: ${passedTests}/${totalTests} Checks Passed. (${failedTests} Failed)`);
    console.log("==========================================================================");
    if (failedTests > 0) {
        process.exit(1);
    }
}
runComprehensiveVerification().catch((e) => {
    console.error("FATAL AUDIT ERROR:", e);
    process.exit(1);
});
