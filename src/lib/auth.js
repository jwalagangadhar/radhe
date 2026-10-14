import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
const COOKIE_NAME = "radhe_session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET ||
    (process.env.NODE_ENV === "production"
        ? (() => {
            throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is required in production.");
        })()
        : "radhe-dev-fallback-secret-2026-safe-only-for-development"));
import { encryptPayload, decryptPayload } from "@/lib/encryption";

export async function createToken(user) {
    const encryptedData = encryptPayload({
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
    });
    return new SignJWT({
        role: user.role,
        enc: encryptedData,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("8h")
        .sign(secret);
}
export async function verifyToken(token) {
    try {
        const { payload } = await jwtVerify(token, secret);
        if (payload.enc) {
            const decrypted = decryptPayload(payload.enc);
            if (!decrypted) return null;
            return {
                ...decrypted,
                role: payload.role || decrypted.role,
            };
        }
        return payload;
    }
    catch {
        return null;
    }
}
export async function getSession() {
    const cookieStore = await cookies();
    let token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
        try {
            const headerStore = await headers();
            const authHeader = headerStore.get("authorization");
            if (authHeader?.startsWith("Bearer ")) {
                token = authHeader.substring(7).trim();
            }
        }
        catch {
            // Non-request context
        }
    }
    if (!token)
        return null;
    return verifyToken(token);
}
export async function setSessionCookie(token) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8, // 8 hours (standard operational shift)
    });
}
export async function clearSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    cookieStore.set(COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
    });
}
export { COOKIE_NAME };
