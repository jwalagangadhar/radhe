async function testSuite() {
    console.log("==================================================");
    console.log("RUNNING ROLE-BASED LOGIN & ROUTE PROTECTION TESTS");
    console.log("==================================================\n");
    const baseUrl = "http://localhost:3000";
    try {
        await fetch(`${baseUrl}/api/products`);
    }
    catch {
        console.warn("⚠️  DEVELOPMENT SERVER NOT RUNNING AT " + baseUrl);
        console.log("👉 Please start the server with 'npm run dev' before executing authentication flow tests.\n");
        return;
    }
    let passed = 0;
    let failed = 0;
    function assert(condition, desc) {
        if (condition) {
            console.log(`✅ PASS: ${desc}`);
            passed++;
        }
        else {
            console.error(`❌ FAIL: ${desc}`);
            failed++;
        }
    }
    // Helper to extract cookies from response headers
    function extractCookie(res) {
        const raw = res.headers.get("set-cookie") || "";
        const match = raw.match(/radhe_session=([^;]+)/);
        return match ? `radhe_session=${match[1]}` : "";
    }
    // TEST 1: Open /portal while logged out -> Expected redirect to /portal/login
    {
        const res = await fetch(`${baseUrl}/portal`, { redirect: "manual" });
        const location = res.headers.get("location");
        assert((res.status === 307 || res.status === 302 || res.status === 308) &&
            location?.includes("/portal/login"), `TEST 1: Logged-out /portal -> redirects to /portal/login (Status: ${res.status}, Location: ${location})`);
    }
    // TEST 2: Login using ADMIN credentials (Email, Username, or Phone)
    let adminCookie = "";
    {
        // Test with admin email
        const res = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: "admin@example.com", password: "admin123" }),
        });
        const data = await res.json();
        adminCookie = extractCookie(res);
        assert(res.status === 200 && data.user?.role === "ADMIN" && !!adminCookie, `TEST 2: Login as ADMIN (Email) -> Success, role=ADMIN, cookie received`);
        // Also verify username login works
        const resUser = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: "admin", password: "admin123" }),
        });
        const dataUser = await resUser.json();
        assert(resUser.status === 200 && dataUser.user?.role === "ADMIN", `TEST 2b: Login as ADMIN (Username) -> Success, role=ADMIN`);
        // Also verify phone login works
        const resPhone = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: "+919876543210", password: "admin123" }),
        });
        const dataPhone = await resPhone.json();
        assert(resPhone.status === 200 && dataPhone.user?.role === "ADMIN", `TEST 2c: Login as ADMIN (Phone) -> Success, role=ADMIN`);
    }
    // TEST 3: Login using WORKER credentials
    let workerCookie = "";
    {
        // Test with worker email
        const res = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: "worker@example.com", password: "worker123" }),
        });
        const data = await res.json();
        workerCookie = extractCookie(res);
        assert(res.status === 200 && data.user?.role === "WORKER" && !!workerCookie, `TEST 3: Login as WORKER (Email) -> Success, role=WORKER, cookie received`);
        // Also verify username login works
        const resUser = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: "worker", password: "worker123" }),
        });
        const dataUser = await resUser.json();
        assert(resUser.status === 200 && dataUser.user?.role === "WORKER", `TEST 3b: Login as WORKER (Username) -> Success, role=WORKER`);
    }
    // TEST 4: WORKER opens /portal/admin -> Expected: Access Denied
    {
        const res = await fetch(`${baseUrl}/portal/admin`, {
            headers: { Cookie: workerCookie },
            redirect: "manual",
        });
        const location = res.headers.get("location");
        assert((res.status === 307 || res.status === 302) &&
            (location?.includes("/portal/access-denied") || location?.includes("/portal/worker")), `TEST 4: WORKER opening /portal/admin -> Denied / Redirected (Status: ${res.status}, Location: ${location})`);
    }
    // TEST 5: ADMIN opens /portal/admin -> Expected: Allowed (200 OK)
    {
        const res = await fetch(`${baseUrl}/portal/admin`, {
            headers: { Cookie: adminCookie },
            redirect: "manual",
        });
        assert(res.status === 200, `TEST 5: ADMIN opening /portal/admin -> Allowed (Status: ${res.status})`);
    }
    // TEST 6: Logged-out user opens /portal/admin -> Expected: /portal/login
    {
        const res = await fetch(`${baseUrl}/portal/admin`, { redirect: "manual" });
        const location = res.headers.get("location");
        assert((res.status === 307 || res.status === 302) && location?.includes("/portal/login"), `TEST 6: Logged-out user opening /portal/admin -> Redirected to /portal/login (Status: ${res.status}, Location: ${location})`);
    }
    // TEST 7: Logged-out user opens /portal/worker -> Expected: /portal/login
    {
        const res = await fetch(`${baseUrl}/portal/worker`, { redirect: "manual" });
        const location = res.headers.get("location");
        assert((res.status === 307 || res.status === 302) && location?.includes("/portal/login"), `TEST 7: Logged-out user opening /portal/worker -> Redirected to /portal/login (Status: ${res.status}, Location: ${location})`);
    }
    // TEST 8: WORKER opens /portal/worker -> Expected: Allowed (200 OK)
    {
        const res = await fetch(`${baseUrl}/portal/worker`, {
            headers: { Cookie: workerCookie },
            redirect: "follow",
        });
        assert(res.status === 200, `TEST 8: WORKER opening /portal/worker -> Allowed (Final Status: ${res.status})`);
    }
    // TEST 9: Logout as ADMIN -> Invalidate session and redirect to /portal/login
    {
        const res = await fetch(`${baseUrl}/api/auth/logout`, {
            method: "POST",
            headers: { Cookie: adminCookie },
        });
        const setCookie = (res.headers.get("set-cookie") || "").toLowerCase();
        assert(res.status === 200 && (setCookie.includes("max-age=0") || setCookie.includes("expires=")), `TEST 9: Logout as ADMIN -> Clears session cookie (Status: ${res.status})`);
    }
    // TEST 10: Logout as WORKER -> Invalidate session
    {
        const res = await fetch(`${baseUrl}/api/auth/logout`, {
            method: "POST",
            headers: { Cookie: workerCookie },
        });
        const setCookie = (res.headers.get("set-cookie") || "").toLowerCase();
        assert(res.status === 200 && (setCookie.includes("max-age=0") || setCookie.includes("expires=")), `TEST 10: Logout as WORKER -> Clears session cookie (Status: ${res.status})`);
    }
    // TEST 11: After logout, manually open /portal/admin -> Expected: /portal/login
    {
        const res = await fetch(`${baseUrl}/portal/admin`, {
            headers: { Cookie: "radhe_session=" },
            redirect: "manual",
        });
        const location = res.headers.get("location");
        assert((res.status === 307 || res.status === 302) && location?.includes("/portal/login"), `TEST 11: After logout, opening /portal/admin -> Redirected to /portal/login (Status: ${res.status}, Location: ${location})`);
    }
    // TEST 12: After logout, manually open /portal/worker -> Expected: /portal/login
    {
        const res = await fetch(`${baseUrl}/portal/worker`, {
            headers: { Cookie: "radhe_session=" },
            redirect: "manual",
        });
        const location = res.headers.get("location");
        assert((res.status === 307 || res.status === 302) && location?.includes("/portal/login"), `TEST 12: After logout, opening /portal/worker -> Redirected to /portal/login (Status: ${res.status}, Location: ${location})`);
    }
    // BONUS TEST: Customer storefront remains working
    {
        const resHome = await fetch(`${baseUrl}/`);
        const resProducts = await fetch(`${baseUrl}/products`);
        assert(resHome.status === 200 && resProducts.status === 200, `CUSTOMER SITE: Public pages (/ and /products) respond with 200 OK`);
    }
    console.log(`\n==================================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================`);
    if (failed > 0) {
        process.exit(1);
    }
}
testSuite().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
