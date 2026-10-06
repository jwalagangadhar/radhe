import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSession, createCustomerToken, setCustomerSessionCookie } from "@/lib/customer-auth";
import { verifyOtp, validateAndNormalizePhone } from "@/lib/otp-service";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const verifyPhoneChangeSchema = z.object({
  newPhone: z.string().min(6).max(20),
  otp: z.string().length(6),
  countryCode: z.string().default("+91"),
});

export async function POST(req: Request) {
  try {
    const session = await getCustomerSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = verifyPhoneChangeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload. 6-digit OTP and new phone number required." },
        { status: 400 }
      );
    }

    const { newPhone, otp, countryCode } = parsed.data;

    // Verify OTP sent to new phone
    const verifyResult = await verifyOtp(newPhone, otp, countryCode, "PHONE_CHANGE");

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

    const normalizedNewPhone = verifyResult.phone;

    // Double check conflict
    const conflict = await prisma.customerUser.findUnique({
      where: { phone: normalizedNewPhone },
    });

    if (conflict && conflict.id !== session.id) {
      return NextResponse.json(
        { error: "This mobile number was recently registered to another account." },
        { status: 409 }
      );
    }

    // Update customer phone in database
    const updated = await prisma.customerUser.update({
      where: { id: session.id },
      data: {
        phone: normalizedNewPhone,
        phoneVerified: true,
      },
    });

    // Re-issue customer session token with new phone
    const newToken = await createCustomerToken({
      id: updated.id,
      phone: updated.phone,
      name: updated.name || "Customer",
      email: updated.email,
      status: updated.status,
      role: "CUSTOMER",
    });

    await setCustomerSessionCookie(newToken);

    return NextResponse.json({
      success: true,
      message: "Mobile number updated and verified successfully!",
      phone: updated.phone,
    });
  } catch (err) {
    console.error("[change-phone verify-otp error]:", err);
    return NextResponse.json({ error: "Failed to verify and update mobile number." }, { status: 500 });
  }
}
