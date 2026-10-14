import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";
import twilio from "twilio";
// Generate invoice number
function generateInvoiceNumber(orderId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hash = orderId.slice(0, 6).toUpperCase();
    return `INV-${year}${month}${day}-${hash}`;
}
// GET - Fetch invoices
export async function GET(req) {
    const auth = await requireAuth(["ADMIN"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        const invoices = await prisma.invoice.findMany({
            include: {
                order: {
                    select: {
                        orderNumber: true,
                        customerName: true,
                        customerPhone: true,
                        total: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ invoices });
    }
    catch (err) {
        return jsonError("Failed to fetch invoices", 500);
    }
}
// POST - Create and send invoice
export async function POST(req) {
    const auth = await requireAuth(["ADMIN"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        const { orderId } = await req.json();
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: true } } },
        });
        if (!order) {
            return jsonError("Order not found", 404);
        }
        // Check if invoice already exists
        let invoice = await prisma.invoice.findUnique({
            where: { orderId },
        });
        if (!invoice) {
            invoice = await prisma.invoice.create({
                data: {
                    orderId,
                    invoiceNumber: generateInvoiceNumber(orderId),
                    grandTotal: order.total,
                    totalTaxable: order.totalTaxable || order.total,
                    totalCgst: order.totalCgst || 0,
                    totalSgst: order.totalSgst || 0,
                    totalIgst: order.totalIgst || 0,
                },
            });
        }
        // Build invoice text
        let invoiceText = `RADHE GROCERY - INVOICE\n`;
        invoiceText += `Invoice: ${invoice.invoiceNumber}\n`;
        invoiceText += `Order #${order.orderNumber}\n`;
        invoiceText += `Date: ${new Date().toLocaleDateString()}\n\n`;
        invoiceText += `Customer: ${order.customerName || "N/A"}\n`;
        invoiceText += `Phone: ${order.customerPhone || "N/A"}\n\n`;
        invoiceText += `ITEMS:\n`;
        invoiceText += `${"".padEnd(50, "-")}\n`;
        for (const item of order.items) {
            invoiceText += `${item.product.name} x ${item.quantity} ${item.product.unit}\n`;
            invoiceText += `₹${item.subtotal.toFixed(2)}\n`;
        }
        invoiceText += `${"".padEnd(50, "-")}\n`;
        invoiceText += `Total: ₹${order.total.toFixed(2)}\n`;
        invoiceText += `\nThank you for your order!`;
        // Send SMS if phone number exists and Twilio is configured
        if (order.customerPhone && process.env.TWILIO_ACCOUNT_SID) {
            try {
                const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                await client.messages.create({
                    body: invoiceText,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: order.customerPhone,
                });
                // Update invoice SMS status
                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: { smsSent: true, sentAt: new Date() },
                });
                return NextResponse.json({
                    invoice,
                    smsSent: true,
                    message: "Invoice sent via SMS",
                });
            }
            catch (smsErr) {
                console.error("SMS error:", smsErr);
                return NextResponse.json({
                    invoice,
                    smsSent: false,
                    warning: "Invoice created but SMS failed to send",
                });
            }
        }
        return NextResponse.json({
            invoice,
            smsSent: false,
            warning: "SMS not configured or no phone number",
        });
    }
    catch (err) {
        return jsonError("Failed to create invoice", 500);
    }
}
