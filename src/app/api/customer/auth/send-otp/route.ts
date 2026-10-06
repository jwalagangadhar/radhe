import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOtp } from "@/lib/otp-service";

export const runtime = "nodejs";

const sendOtpSchema = z.object({
  phone: z.string().min(6).max(20),
  countryCode: z.string().default("+91"),
  purpose: z.enum(["LOGIN", "PHONE_CHANGE"]).default("LOGIN"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = sendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid phone number or country code format." },
        { status: 400 }
      );
    }

    const { phone, countryCode, purpose } = parsed.data;

    // Extract client IP address for defense-in-depth rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") ?? undefined;

    const result = await sendOtp(phone, countryCode, purpose, ipAddress);

    if (!result.success) {
      const status = result.code === "COOLDOWN_ACTIVE" || result.code === "RATE_LIMITED" ? 429 : 400;
      return NextResponse.json(
        {
          error: result.error,
          cooldownSeconds: result.cooldownSeconds,
          code: result.code,
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.isSimulated
        ? "Development Mode: Simulated OTP generated."
        : "6-digit OTP sent successfully to your mobile number.",
      cooldownSeconds: result.cooldownSeconds,
      expiresInSeconds: result.expiresInSeconds,
      isSimulated: result.isSimulated,
      simulatedOtp: result.simulatedOtp,
    });
  } catch (err) {
    console.error("[send-otp route error]:", err);
    return NextResponse.json(
      { error: "Failed to process OTP request. Please try again." },
      { status: 500 }
    );
  }
}
