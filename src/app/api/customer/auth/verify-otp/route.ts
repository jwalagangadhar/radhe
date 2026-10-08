import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp, validateAndNormalizePhone } from "@/lib/otp-service";
import { prisma } from "@/lib/db";
import { createCustomerToken, setCustomerSessionCookie } from "@/lib/customer-auth";

export const runtime = "nodejs";

const verifyOtpSchema = z
  .object({
    phone: z.string().min(6).max(20),
    otp: z.string().length(6).optional(),
    code: z.string().length(6).optional(),
    countryCode: z.string().default("+91"),
    name: z.string().max(80).optional(),
  })
  .refine((data) => !!(data.otp || data.code), {
    message: "A 6-digit OTP is required.",
  });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload. A 6-digit OTP and phone number are required." },
        { status: 400 }
      );
    }

    const { phone, countryCode, name } = parsed.data;
    const otp = (parsed.data.otp || parsed.data.code)!;

    // Verify OTP against hashed record in database
    const verifyResult = await verifyOtp(phone, otp, countryCode, "LOGIN");

    if (!verifyResult.success || !verifyResult.phone) {
      const status = verifyResult.code === "MAX_ATTEMPTS_EXCEEDED" ? 429 : 400;
      return NextResponse.json(
        {
          error: verifyResult.error,
          remainingAttempts: verifyResult.remainingAttempts,
          code: verifyResult.code,
        },
        { status }
      );
    }

    const normalizedPhone = verifyResult.phone;

    // Find or create customer account
    let customerUser = await prisma.customerUser.findUnique({
      where: { phone: normalizedPhone },
    });

    let isFirstLogin = false;

    if (!customerUser) {
      isFirstLogin = true;
      const initialName = name?.trim() || `Customer ${normalizedPhone.slice(-4)}`;
      customerUser = await prisma.customerUser.create({
        data: {
          phone: normalizedPhone,
          phoneVerified: true,
          name: initialName,
          status: "ACTIVE",
        },
      });
    } else {
      // Check account status
      if (customerUser.status === "SUSPENDED" || customerUser.status === "BLOCKED") {
        return NextResponse.json(
          { error: "This customer account is suspended. Please contact customer support." },
          { status: 403 }
        );
      }

      // Update phoneVerified and update name if it wasn't set earlier
      if (!customerUser.phoneVerified || (name?.trim() && (!customerUser.name || customerUser.name.startsWith("Customer ")))) {
        customerUser = await prisma.customerUser.update({
          where: { id: customerUser.id },
          data: {
            phoneVerified: true,
            ...(name?.trim() ? { name: name.trim() } : {}),
          },
        });
      }
    }

    // Create session token and set HTTP-only cookie
    const token = await createCustomerToken({
      id: customerUser.id,
      phone: customerUser.phone,
      name: customerUser.name || "Customer",
      email: customerUser.email,
      status: customerUser.status,
      role: "CUSTOMER",
    });

    await setCustomerSessionCookie(token);

    return NextResponse.json({
      success: true,
      token,
      message: isFirstLogin ? "Welcome! Account created successfully." : "Welcome back! Login successful.",
      isFirstLogin,
      user: {
        id: customerUser.id,
        name: customerUser.name,
        phone: customerUser.phone,
        email: customerUser.email,
        phoneVerified: customerUser.phoneVerified,
      },
    });
  } catch (err) {
    console.error("[verify-otp route error]:", err);
    return NextResponse.json(
      { error: "Failed to verify OTP. Please try again." },
      { status: 500 }
    );
  }
}
