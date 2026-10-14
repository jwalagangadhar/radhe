export function buildOrderAlertMessage(order) {
    const lines = order.items.map((item) => `• ${item.product.name} — ${item.quantity} ${item.product.unit} × ₹${item.unitPrice.toFixed(2)} = ₹${item.subtotal.toFixed(2)}`);
    return [
        "🛒 NEW ORDER — Radhe Daily Essentials",
        "",
        `Order #${order.orderNumber}`,
        `Tracking Number: #${order.orderNumber}`,
        `Customer: ${order.customerName ?? "Walk-in"}`,
        `Phone: ${order.customerPhone ?? "—"}`,
        `Address: ${order.deliveryAddress ?? "Shop pickup"}`,
        order.gstNumber ? `GST: ${order.gstNumber}` : null,
        "",
        "Items:",
        ...lines,
        "",
        `Total: ₹${order.total.toFixed(2)}`,
    ]
        .filter(Boolean)
        .join("\n");
}
export async function sendOrderAlert(order) {
    const message = buildOrderAlertMessage(order);
    const adminPhone = process.env.ADMIN_PHONE;
    if (!adminPhone) {
        console.log("[Notification] ADMIN_PHONE not set. Alert:\n", message);
        return { sent: false, error: "ADMIN_PHONE not configured" };
    }
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
    const smsFrom = process.env.TWILIO_PHONE_NUMBER;
    if (!sid || !token) {
        console.log("[Notification] Twilio not configured. Alert:\n", message);
        return { sent: false, error: "Twilio not configured — logged to console" };
    }
    try {
        const twilio = (await import("twilio")).default(sid, token);
        const toWhatsapp = adminPhone.startsWith("whatsapp:")
            ? adminPhone
            : `whatsapp:${adminPhone}`;
        const toSms = adminPhone.replace(/^whatsapp:/, "");
        if (whatsappFrom) {
            await twilio.messages.create({
                from: whatsappFrom,
                to: toWhatsapp,
                body: message,
            });
            return { sent: true, channel: "whatsapp" };
        }
        if (smsFrom) {
            await twilio.messages.create({
                from: smsFrom,
                to: toSms,
                body: message,
            });
            return { sent: true, channel: "sms" };
        }
        console.log("[Notification] No Twilio sender configured. Alert:\n", message);
        return { sent: false, error: "No Twilio sender number configured" };
    }
    catch (err) {
        const error = err instanceof Error ? err.message : "Unknown error";
        console.error("[Notification] Failed to send:", error);
        console.log("[Notification] Alert content:\n", message);
        return { sent: false, error };
    }
}
export async function sendCustomerInvoiceSms(order) {
    if (!order.customerPhone) {
        return { sent: false, error: "Customer has no phone number" };
    }
    const itemsText = order.items
        .map((item) => `• ${item.product.name} — ${item.quantity} ${item.product.unit} @ ₹${item.unitPrice}`)
        .join("\n");
    const message = [
        `📄 INVOICE — Radhe Daily Essentials`,
        `Order Number: #${order.orderNumber}`,
        `Customer: ${order.customerName ?? "Valued Customer"}`,
        `Total: ₹${order.total.toFixed(2)}`,
        "",
        "Items:",
        itemsText,
        "",
        `Thank you for shopping with us!`,
    ].join("\n");
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const smsFrom = process.env.TWILIO_PHONE_NUMBER;
    if (!sid || !token || !smsFrom) {
        console.log("[Notification] Twilio not configured. Simulating SMS invoice to:", order.customerPhone, "\nMessage:\n", message);
        return { sent: false, error: "Twilio not configured — simulated in logs" };
    }
    try {
        const twilio = (await import("twilio")).default(sid, token);
        await twilio.messages.create({
            from: smsFrom,
            to: order.customerPhone,
            body: message,
        });
        return { sent: true, channel: "sms" };
    }
    catch (err) {
        const error = err instanceof Error ? err.message : "Unknown error";
        console.error("[Notification] Failed to send invoice SMS:", error);
        return { sent: false, error };
    }
}
