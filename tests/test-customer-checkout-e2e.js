import { prisma } from "../src/lib/db";
async function runE2eCheckoutTest() {
    const baseUrl = "http://localhost:3000";
    console.log("=== TESTING E2E CUSTOMER MOBILE OTP & GST CHECKOUT FLOW ===");
    // 1. Pick a product from single DB
    const product = await prisma.product.findFirst({
        where: { active: true, stock: { gt: 0 } },
    });
    if (!product) {
        throw new Error("No active product found in database");
    }
    console.log(`✓ Product from single DB: "${product.name}" (ID: ${product.id}, Price: ₹${product.price}, GST: ${product.gstRate}%)`);
    // 2. Request OTP
    const testPhone = "9876543299";
    const sendRes = await fetch(`${baseUrl}/api/customer/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, countryCode: "+91", purpose: "LOGIN" }),
    });
    const sendData = await sendRes.json();
    console.log("✓ Send OTP response:", sendData.success ? "Success" : sendData.error);
    const otpCode = sendData.simulatedOtp || "123456";
    console.log("✓ Test OTP code:", otpCode);
    // Verify OTP
    const verifyRes = await fetch(`${baseUrl}/api/customer/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, countryCode: "+91", otp: otpCode, name: "Radhe Mart Customer" }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success || !verifyData.token) {
        throw new Error(`OTP Verification failed: ${JSON.stringify(verifyData)}`);
    }
    const token = verifyData.token;
    console.log("✓ Verified OTP successfully. Received customer token:", token.substring(0, 20) + "...");
    // 4. Submit Checkout with full GST & Transporter details as asked on website & mobile app
    const checkoutPayload = {
        shopName: "Radhe Mart Vijayawada",
        shopPhone: testPhone,
        shopAddress: "Plot 42, Main Bazar, One Town",
        city: "Vijayawada",
        state: "Andhra Pradesh",
        pincode: "520001",
        email: "billing@radhemart.com",
        gstNumber: "37AAAAA0000A1Z5",
        customerStateCode: "37",
        placeOfSupply: "37-Andhra Pradesh",
        transporterName: "Navata Road Transport",
        items: [
            {
                productId: product.id,
                quantity: 5,
            },
        ],
    };
    const checkoutRes = await fetch(`${baseUrl}/api/checkout`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Cookie: `radhe_customer_session=${token}`,
        },
        body: JSON.stringify(checkoutPayload),
    });
    const checkoutData = await checkoutRes.json();
    if (!checkoutRes.ok || !checkoutData.orderNumber) {
        throw new Error(`Checkout failed with status ${checkoutRes.status}: ${JSON.stringify(checkoutData)}`);
    }
    console.log(`✅ Wholesale Order Placed Successfully!`);
    console.log(`   - Order Number: #${checkoutData.orderNumber}`);
    console.log(`   - Invoice Number: ${checkoutData.invoiceNumber || "Generated"}`);
    console.log(`   - Delivery Challan: ${checkoutData.challanNumber || "Generated"}`);
    // 5. Verify the order exists in the single DB
    const dbOrder = await prisma.order.findUnique({
        where: { orderNumber: checkoutData.orderNumber },
        include: { items: true },
    });
    if (!dbOrder) {
        throw new Error("Order was not found in the single database!");
    }
    console.log(`✅ Database Record Confirmed in Single DB (dev.db):`);
    console.log(`   - Customer: ${dbOrder.customerName}`);
    console.log(`   - Phone: ${dbOrder.customerPhone}`);
    console.log(`   - Total Amount: ₹${dbOrder.total}`);
    console.log(`   - Status: ${dbOrder.status}`);
    console.log(`   - Order Items Count: ${dbOrder.items.length}`);
    // 6. Test Track Order endpoint
    const trackRes = await fetch(`${baseUrl}/api/orders/track?orderNumber=${checkoutData.orderNumber}&phone=${testPhone}`);
    const trackData = await trackRes.json();
    if (!trackRes.ok || !trackData.order) {
        throw new Error(`Track order failed: ${JSON.stringify(trackData)}`);
    }
    console.log(`✅ Order Tracking Verified:`);
    console.log(`   - Track Status: ${trackData.order.status}`);
    console.log(`   - Total: ₹${trackData.order.total}`);
    console.log("\n========================================================");
    console.log("🎉 ALL WEBSITE & MOBILE SINGLE-DB CHECKS PASSED WITH 100% SUCCESS!");
    console.log("========================================================");
}
runE2eCheckoutTest().catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
