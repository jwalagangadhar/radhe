import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";

export const CUSTOMER_COOKIE_NAME = "radhe_customer_session";
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "radhe-customer-session-secret-salt-2026"
);

export interface CustomerSession {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  status: string;
  role: "CUSTOMER";
}

/**
 * Creates a signed JWT for authenticated customer sessions (valid for 30 days).
 */
export async function createCustomerToken(customer: CustomerSession): Promise<string> {
  return new SignJWT({ ...customer })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

/**
 * Verifies a customer JWT token and extracts claims.
 */
export async function verifyCustomerToken(token: string): Promise<CustomerSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "CUSTOMER" || !payload.id || !payload.phone) {
      return null;
    }
    return payload as unknown as CustomerSession;
  } catch {
    return null;
  }
}

/**
 * Retrieves the currently authenticated customer session from cookies or headers.
 * Validates against active database status.
 */
export async function getCustomerSession(req?: Request): Promise<CustomerSession | null> {
  let token: string | undefined;

  // 1. Try reading from Request if provided
  if (req) {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`(?:^|; )${CUSTOMER_COOKIE_NAME}=([^;]*)`));
    if (match) {
      token = decodeURIComponent(match[1]);
    }
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }
  }

  // 2. Try next/headers cookies()
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;
    } catch {
      // Not in Next.js Server Component / Route Handler context
    }
  }

  // 3. Try next/headers headers()
  if (!token) {
    try {
      const headerStore = await headers();
      const authHeader = headerStore.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    } catch {
      // Non-request context
    }
  }

  if (!token) return null;

  const verified = await verifyCustomerToken(token);
  if (!verified) return null;

  // 4. Verify user still exists in database and is ACTIVE
  try {
    const dbUser = await prisma.customerUser.findUnique({
      where: { id: verified.id },
      select: { id: true, phone: true, name: true, email: true, status: true },
    });

    if (!dbUser || dbUser.status !== "ACTIVE") {
      return null;
    }

    return {
      id: dbUser.id,
      phone: dbUser.phone,
      name: dbUser.name || "Customer",
      email: dbUser.email,
      status: dbUser.status,
      role: "CUSTOMER",
    };
  } catch {
    return verified;
  }
}

/**
 * Sets the HTTP-only secure cookie for customer sessions.
 */
export async function setCustomerSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

/**
 * Clears the customer session cookie.
 */
export async function clearCustomerSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_COOKIE_NAME);
  cookieStore.set(CUSTOMER_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}
