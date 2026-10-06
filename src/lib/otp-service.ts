import crypto from "crypto";
import { prisma } from "@/lib/db";

const OTP_SECRET = process.env.JWT_SECRET || "radhe-otp-secret-salt-2026";
const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_REQUESTS_PER_WINDOW = 5;
const REQUEST_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export interface PhoneValidationResult {
  valid: boolean;
  e164Phone: string;
  error?: string;
}

/**
 * Validates and normalizes phone number to E.164 format.
 * Default country is India (+91).
 */
export function validateAndNormalizePhone(phone: string, countryCode = "+91"): PhoneValidationResult {
  if (!phone || typeof phone !== "string") {
    return { valid: false, e164Phone: "", error: "Phone number is required." };
  }

  // Remove non-digit characters except leading plus
  let cleaned = phone.trim().replace(/[^\d+]/g, "");

  // If phone already starts with +, normalize
  if (cleaned.startsWith("+")) {
    const digitsOnly = cleaned.substring(1);
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      return { valid: false, e164Phone: "", error: "Invalid international phone number length." };
    }
    // Specific check for India (+91)
    if (cleaned.startsWith("+91")) {
      const national = cleaned.substring(3);
      if (!/^[6-9]\d{9}$/.test(national)) {
        return { valid: false, e164Phone: "", error: "Please enter a valid 10-digit Indian mobile number." };
      }
    }
    return { valid: true, e164Phone: cleaned };
  }

  // Country code normalization
  const cleanCountry = countryCode.startsWith("+") ? countryCode : `+${countryCode.replace(/\D/g, "")}`;

  // If Indian country code (+91)
  if (cleanCountry === "+91") {
    // Strip leading 0 if provided (e.g. 09876543210 -> 9876543210)
    if (cleaned.length === 11 && cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    // Check 10-digit Indian mobile starting with 6, 7, 8, or 9
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      return {
        valid: false,
        e164Phone: "",
        error: "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.",
      };
    }
    return { valid: true, e164Phone: `+91${cleaned}` };
  }

  // Other country codes
  if (cleaned.length < 6 || cleaned.length > 14) {
    return { valid: false, e164Phone: "", error: "Invalid mobile number for selected country code." };
  }

  return { valid: true, e164Phone: `${cleanCountry}${cleaned}` };
}

/**
 * Creates a cryptographically secure hash of the 6-digit OTP.
 * Plain text OTP is never stored in the database.
 */
export function hashOtp(phone: string, otp: string): string {
  return crypto
    .createHmac("sha256", OTP_SECRET)
    .update(`${phone}:${otp}`)
    .digest("hex");
}

/**
 * Timing-safe comparison of OTP hashes.
 */
export function verifyOtpHash(phone: string, candidateOtp: string, expectedHash: string): boolean {
  const candidateHash = hashOtp(phone, candidateOtp);
  try {
    const a = Buffer.from(candidateHash, "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Mask phone number for logging and UI display (e.g. +91 98*** **210)
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 8) return phone;
  const start = phone.slice(0, phone.length - 6);
  const end = phone.slice(-2);
  return `${start}****${end}`;
}

export interface SendOtpResult {
  success: boolean;
  cooldownSeconds?: number;
  expiresInSeconds?: number;
  isSimulated?: boolean;
  simulatedOtp?: string;
  error?: string;
  code?: "COOLDOWN_ACTIVE" | "RATE_LIMITED" | "DISPATCH_FAILED" | "INVALID_INPUT";
}

/**
 * Generates and securely dispatches a 6-digit OTP via Twilio SMS or Fast2SMS.
 * If credentials are not configured in local environment, runs in simulation mode
 * and returns the test OTP so development testing works 100% interactively.
 */
export async function sendOtp(
  rawPhone: string,
  countryCode = "+91",
  purpose: "LOGIN" | "PHONE_CHANGE" = "LOGIN",
  ipAddress?: string
): Promise<SendOtpResult> {
  const validation = validateAndNormalizePhone(rawPhone, countryCode);
  if (!validation.valid) {
    return { success: false, error: validation.error, code: "INVALID_INPUT" };
  }
  const phone = validation.e164Phone;

  const now = new Date();

  // 1. Rate limiting: Check recent requests window (last 10 minutes)
  const windowStart = new Date(now.getTime() - REQUEST_WINDOW_MS);
  const recentRequestsCount = await prisma.otpVerification.count({
    where: {
      phone,
      createdAt: { gte: windowStart },
    },
  });

  if (recentRequestsCount >= MAX_REQUESTS_PER_WINDOW) {
    return {
      success: false,
      error: "Too many OTP requests. Please wait a few minutes before trying again.",
      code: "RATE_LIMITED",
    };
  }

  // 2. Cooldown check: Check if an OTP was sent in the last 60 seconds
  const lastOtp = await prisma.otpVerification.findFirst({
    where: { phone, purpose },
    orderBy: { createdAt: "desc" },
  });

  if (lastOtp) {
    const elapsedSeconds = Math.floor((now.getTime() - lastOtp.createdAt.getTime()) / 1000);
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const waitRemaining = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      return {
        success: false,
        cooldownSeconds: waitRemaining,
        error: `Please wait ${waitRemaining} seconds before requesting a new OTP.`,
        code: "COOLDOWN_ACTIVE",
      };
    }
  }

  // 3. Invalidate any previous unverified OTPs for this phone and purpose
  await prisma.otpVerification.updateMany({
    where: { phone, purpose, verified: false },
    data: { verified: true }, // Mark old ones as inactive so they cannot be reused
  });

  // 4. Generate 6-digit cryptographically secure OTP
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = hashOtp(phone, rawOtp);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // 5. Store OTP record in DB (ONLY hash is stored, never plain text)
  await prisma.otpVerification.create({
    data: {
      phone,
      otpHash: hashedOtp,
      attempts: 0,
      maxAttempts: MAX_VERIFY_ATTEMPTS,
      expiresAt,
      verified: false,
      purpose,
      ipAddress: ipAddress ?? null,
    },
  });

  // 6. Dispatch OTP through Twilio SMS or Fast2SMS if configured
  const smsBody = `Your Radhe verification code is ${rawOtp}. Valid for 5 minutes. Do not share this OTP with anyone.`;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;

  let smsSent = false;

  if (sid && token && fromNumber) {
    try {
      const twilio = (await import("twilio")).default(sid, token);
      await twilio.messages.create({
        body: smsBody,
        from: fromNumber,
        to: phone,
      });
      smsSent = true;
      console.log(`[OTP] Twilio SMS successfully dispatched to ${maskPhoneNumber(phone)}`);
    } catch (err) {
      console.error("[OTP] Twilio SMS dispatch failed:", err);
      return {
        success: false,
        error: "Failed to send SMS to your mobile number. Please verify the number and try again.",
        code: "DISPATCH_FAILED",
      };
    }
  } else if (fast2SmsKey && phone.startsWith("+91")) {
    try {
      const nationalNumber = phone.replace("+91", "");
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: fast2SmsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: rawOtp,
          numbers: nationalNumber,
        }),
      });
      const data = await res.json();
      if (data && data.return) {
        smsSent = true;
        console.log(`[OTP] Fast2SMS dispatched successfully to ${maskPhoneNumber(phone)}`);
      } else {
        console.error("[OTP] Fast2SMS dispatch returned error:", data);
      }
    } catch (err) {
      console.error("[OTP] Fast2SMS request failed:", err);
    }
  }

  const isSimulation = !smsSent;
  if (isSimulation) {
    console.log(
      `[OTP Provider SIMULATION] Backend OTP generated for ${maskPhoneNumber(phone)}: Code ${rawOtp}`
    );
  }

  return {
    success: true,
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    isSimulated: isSimulation,
    simulatedOtp: isSimulation ? rawOtp : undefined,
  };
}

export interface VerifyOtpResult {
  success: boolean;
  phone?: string;
  error?: string;
  remainingAttempts?: number;
  code?: "EXPIRED" | "MAX_ATTEMPTS_EXCEEDED" | "INVALID_CODE" | "NOT_FOUND" | "BLOCKED";
}

/**
 * Validates a submitted 6-digit OTP against the secure hash in DB.
 * Protects against brute-force attacks by limiting attempts.
 */
export async function verifyOtp(
  rawPhone: string,
  candidateOtp: string,
  countryCode = "+91",
  purpose: "LOGIN" | "PHONE_CHANGE" = "LOGIN"
): Promise<VerifyOtpResult> {
  const validation = validateAndNormalizePhone(rawPhone, countryCode);
  if (!validation.valid) {
    return { success: false, error: validation.error, code: "INVALID_CODE" };
  }
  const phone = validation.e164Phone;

  if (!candidateOtp || candidateOtp.trim().length !== 6 || !/^\d{6}$/.test(candidateOtp.trim())) {
    return { success: false, error: "Please enter a valid 6-digit OTP.", code: "INVALID_CODE" };
  }
  const cleanOtp = candidateOtp.trim();

  // Find latest active OTP record for this phone & purpose
  const record = await prisma.otpVerification.findFirst({
    where: {
      phone,
      purpose,
      verified: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return {
      success: false,
      error: "No active OTP request found. Please request a new OTP.",
      code: "NOT_FOUND",
    };
  }

  const now = new Date();

  // 1. Check expiration
  if (record.expiresAt < now) {
    return {
      success: false,
      error: "This OTP has expired. Please request a new code.",
      code: "EXPIRED",
    };
  }

  // 2. Check maximum attempts (brute force lockout)
  if (record.attempts >= record.maxAttempts) {
    // Invalidate record
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { verified: true },
    });
    return {
      success: false,
      error: "Too many failed attempts. This OTP has been invalidated for security. Please request a new one.",
      code: "MAX_ATTEMPTS_EXCEEDED",
    };
  }

  // 3. Verify hash
  const isValid = verifyOtpHash(phone, cleanOtp, record.otpHash);

  if (!isValid) {
    const updatedAttempts = record.attempts + 1;
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: updatedAttempts },
    });

    const remaining = record.maxAttempts - updatedAttempts;
    if (remaining <= 0) {
      return {
        success: false,
        error: "Too many incorrect attempts. This OTP is now locked. Please request a new code.",
        remainingAttempts: 0,
        code: "MAX_ATTEMPTS_EXCEEDED",
      };
    }

    return {
      success: false,
      error: `Incorrect OTP. You have ${remaining} ${remaining === 1 ? "attempt" : "attempts"} remaining.`,
      remainingAttempts: remaining,
      code: "INVALID_CODE",
    };
  }

  // 4. Mark verified
  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return {
    success: true,
    phone,
  };
}
