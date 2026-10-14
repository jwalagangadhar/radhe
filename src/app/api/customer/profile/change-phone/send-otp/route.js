import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSession } from "@/lib/customer-auth";
import { validateAndNormalizePhone, sendOtp } from "@/lib/otp-service";
import { prisma } from "@/lib/db";
export const runtime = "nodejs";
const changePhoneSchema = z.object({
    newPhone: z.string().min(6).max(20),
    countryCode: z.string().default("+91"),
});
export async function POST(req) {
    try {
        const session = await getCustomerSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
        }
        const body = await req.json();
        const parsed = changePhoneSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid mobile number format." }, { status: 400 });
        }
        const { newPhone, countryCode } = parsed.data;
        const validated = validateAndNormalizePhone(newPhone, countryCode);
        if (!validated.valid) {
            return NextResponse.json({ error: validated.error }, { status: 400 });
        }
        if (validated.e164Phone === session.phone) {
            return NextResponse.json({ error: "New mobile number cannot be the same as your current verified mobile number." }, { status: 400 });
        }
        // Check if new phone is already in use by another customer
        const existing = await prisma.customerUser.findUnique({
            where: { phone: validated.e164Phone },
        });
        if (existing && existing.id !== session.id) {
            return NextResponse.json({ error: "This mobile number is already linked to another account." }, { status: 409 });
        }
        // Extract client IP address
        const forwarded = req.headers.get("x-forwarded-for");
        const ipAddress = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") ?? undefined;
        const result = await sendOtp(validated.e164Phone, countryCode, "PHONE_CHANGE", ipAddress);
        if (!result.success) {
            const status = result.code === "COOLDOWN_ACTIVE" || result.code === "RATE_LIMITED" ? 429 : 400;
            return NextResponse.json({
                error: result.error,
                cooldownSeconds: result.cooldownSeconds,
                code: result.code,
            }, { status });
        }
        return NextResponse.json({
            success: true,
            message: result.isSimulated
                ? "Development Mode: Simulated OTP generated."
                : "Verification code sent to your new mobile number.",
            cooldownSeconds: result.cooldownSeconds,
            expiresInSeconds: result.expiresInSeconds,
            isSimulated: process.env.NODE_ENV !== "production" ? result.isSimulated : false,
            simulatedOtp: process.env.NODE_ENV !== "production" ? result.simulatedOtp : undefined,
        });
    }
    catch (err) {
        console.error("[change-phone send-otp error]:", err);
        return NextResponse.json({ error: "Failed to send verification code." }, { status: 500 });
    }
}
