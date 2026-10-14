import { NextResponse } from "next/server";
import { prisma as dbClient } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
const prisma = dbClient;
function isValidImageSignature(buffer) {
    if (buffer.length < 12)
        return { valid: false, ext: "" };
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { valid: true, ext: "jpg" };
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a) {
        return { valid: true, ext: "png" };
    }
    // WEBP: "RIFF" .... "WEBP"
    if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
        return { valid: true, ext: "webp" };
    }
    return { valid: false, ext: "" };
}
export async function POST(req) {
    try {
        const formData = await req.formData();
        const fromRaw = formData.get("From") || "";
        const cleanPhone = fromRaw.replace(/[^0-9]/g, "").slice(-10);
        const bodyText = formData.get("Body") || "";
        const numMedia = parseInt(formData.get("NumMedia") || "0");
        if (cleanPhone.length < 10) {
            return twimlMessage("Please send your message from a valid registered phone number.");
        }
        // 1. Locate active open support ticket for this phone
        let ticket = await prisma.supportTicket.findFirst({
            where: {
                customerPhone: cleanPhone,
                status: { in: ["OPEN", "IN_PROGRESS"] },
            },
            orderBy: { createdAt: "desc" },
        });
        // If no open ticket, create a new intake ticket
        if (!ticket) {
            const currentYear = new Date().getFullYear();
            const count = await prisma.supportTicket.count();
            const ticketNumber = `T-${currentYear}-${(1001 + count).toString()}`;
            ticket = await prisma.supportTicket.create({
                data: {
                    ticketNumber,
                    customerPhone: cleanPhone,
                    issueType: "DAMAGED_PRODUCT",
                    priority: "HIGH",
                    status: "OPEN",
                    description: bodyText || "Customer submitted photographs via WhatsApp.",
                },
            });
        }
        // 2. Process and save any attached media
        const uploadDir = join(process.cwd(), "public", "uploads", "support");
        await mkdir(uploadDir, { recursive: true });
        let savedCount = 0;
        for (let i = 0; i < numMedia; i++) {
            const rawMediaUrl = formData.get(`MediaUrl${i}`);
            const mediaType = formData.get(`MediaContentType${i}`) || "image/jpeg";
            if (rawMediaUrl) {
                try {
                    // SSRF protection: parse and strictly allow HTTPS from Twilio domains
                    const parsed = new URL(rawMediaUrl);
                    const isAllowedHost = parsed.protocol === "https:" &&
                        (parsed.hostname === "api.twilio.com" || parsed.hostname.endsWith(".twilio.com"));
                    if (!isAllowedHost) {
                        console.warn(`[WhatsApp Webhook] Blocked untrusted media URL: ${rawMediaUrl}`);
                        continue;
                    }
                    const res = await fetch(parsed.toString());
                    if (res.ok) {
                        const arrayBuffer = await res.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        // Validate binary magic bytes strictly
                        const sig = isValidImageSignature(buffer);
                        if (!sig.valid) {
                            console.warn(`[WhatsApp Webhook] Rejected non-image or spoofed media from: ${parsed.hostname}`);
                            continue;
                        }
                        const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${sig.ext}`;
                        const filePath = join(uploadDir, fileName);
                        await writeFile(filePath, buffer);
                        const fileUrl = `/uploads/support/${fileName}`;
                        await prisma.ticketAttachment.create({
                            data: {
                                ticketId: ticket.id,
                                fileUrl,
                                fileName,
                                mimeType: mediaType,
                                fileSize: buffer.length,
                                source: "WHATSAPP",
                            },
                        });
                        savedCount++;
                    }
                }
                catch (fetchErr) {
                    console.error(`[WhatsApp Webhook] Failed to download media:`, fetchErr);
                }
            }
        }
        // Reply confirmation via WhatsApp TwiML
        if (savedCount > 0) {
            return twimlMessage(`✅ *Photographs Received*\n\n` +
                `Thank you! We have attached ${savedCount} photograph(s) directly to your Support Ticket *#${ticket.ticketNumber}*.\n\n` +
                `Our store manager at Rajyalakshmi Radhe Traders has been notified and will review the bag/product condition and contact you shortly.`);
        }
        else {
            return twimlMessage(`Support Ticket *#${ticket.ticketNumber}* is active. Please send photographs of the damaged product, bag packaging, or batch label to attach them to your ticket.`);
        }
    }
    catch (err) {
        console.error("[WhatsApp Incoming Webhook] Error:", err);
        return twimlMessage("Thank you for contacting Rajyalakshmi Radhe Traders. Your message has been received.");
    }
}
function twimlMessage(text) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(text)}</Message>
</Response>`;
    return new NextResponse(xml, { headers: { "Content-Type": "text/xml" } });
}
function escapeXml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
