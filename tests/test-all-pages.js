import { SignJWT } from "jose";
async function testAll() {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "radhe-grocery-change-this-in-production");
    const adminToken = await new SignJWT({ id: "admin-1", username: "admin", role: "ADMIN", name: "Admin" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("8h")
        .sign(secret);
    const workerToken = await new SignJWT({ id: "worker-1", username: "worker", role: "WORKER", name: "Worker" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("8h")
        .sign(secret);
    const pages = [
        // Customer Storefront
        { name: "Storefront Home", url: "/", auth: null, expectedStatus: 200 },
        { name: "About Us", url: "/about", auth: null, expectedStatus: 200 },
        { name: "Wholesale Catalog", url: "/products", auth: null, expectedStatus: 200 },
        { name: "Cart", url: "/cart", auth: null, expectedStatus: 200 },
        { name: "Checkout", url: "/checkout", auth: null, expectedStatus: 200 },
        { name: "Order Success", url: "/order-success", auth: null, expectedStatus: 200 },
        { name: "Track Order", url: "/track", auth: null, expectedStatus: 200 },
        // Auth & Access Control
        { name: "Portal Login", url: "/portal/login", auth: null, expectedStatus: 200 },
        { name: "Access Denied (Logged In)", url: "/portal/access-denied", auth: workerToken, expectedStatus: 200 },
        { name: "Portal Root (Auto Redirect)", url: "/portal", auth: adminToken, expectedStatus: 307 },
        // Admin Portal
        { name: "Admin Dashboard", url: "/portal/admin", auth: adminToken, expectedStatus: 200 },
        { name: "Admin Customers", url: "/portal/admin/customers", auth: adminToken, expectedStatus: 200 },
        { name: "Admin Stock Arrivals", url: "/portal/admin/arrivals", auth: adminToken, expectedStatus: 200 },
        { name: "Admin Cash Counter", url: "/portal/admin/cash-counter", auth: adminToken, expectedStatus: 200 },
        { name: "Admin Inventory", url: "/portal/admin/inventory", auth: adminToken, expectedStatus: 200 },
        { name: "Admin Orders", url: "/portal/admin/orders", auth: adminToken, expectedStatus: 200 },
        { name: "Admin Quick Order", url: "/portal/admin/quick-order", auth: adminToken, expectedStatus: 200 },
        { name: "Admin Settings", url: "/portal/admin/settings", auth: adminToken, expectedStatus: 200 },
        { name: "Admin Stock Requests", url: "/portal/admin/stock-requests", auth: adminToken, expectedStatus: 200 },
        { name: "Admin Take Order", url: "/portal/admin/take-order", auth: adminToken, expectedStatus: 200 },
        { name: "Customer Login", url: "/login", auth: null, expectedStatus: 200 },
        { name: "Customer Account (Redirect if unauth)", url: "/account", auth: null, expectedStatus: 200 },
        // Worker Portal
        { name: "Worker Index (Redirects to Queue)", url: "/portal/worker", auth: workerToken, expectedStatus: 307 },
        { name: "Worker History", url: "/portal/worker/history", auth: workerToken, expectedStatus: 200 },
        { name: "Worker Queue", url: "/portal/worker/queue", auth: workerToken, expectedStatus: 200 },
        { name: "Worker Quick Order", url: "/portal/worker/quick-order", auth: workerToken, expectedStatus: 200 },
        { name: "Worker Stock", url: "/portal/worker/stock", auth: workerToken, expectedStatus: 200 },
    ];
    let passed = 0;
    let failed = 0;
    console.log("Testing all 25 application pages on http://localhost:3000...\n");
    for (const page of pages) {
        try {
            const headers = page.auth ? { Cookie: `radhe_session=${page.auth}` } : {};
            const res = await fetch(`http://localhost:3000${page.url}`, { headers, redirect: "manual" });
            const status = res.status;
            const ok = status === page.expectedStatus;
            if (ok) {
                console.log(`[PASS] ${page.name.padEnd(32)} ${page.url.padEnd(28)} -> ${status}`);
                passed++;
            }
            else {
                console.log(`[FAIL] ${page.name.padEnd(32)} ${page.url.padEnd(28)} -> Got ${status}, expected ${page.expectedStatus}`);
                failed++;
            }
        }
        catch (err) {
            console.log(`[FAIL] ${page.name.padEnd(32)} ${page.url.padEnd(28)} -> Error: ${err?.message}`);
            failed++;
        }
    }
    console.log(`\n================================================================`);
    console.log(`Results: ${passed}/${pages.length} pages passed (${failed} failed)`);
    console.log(`================================================================`);
}
testAll();
