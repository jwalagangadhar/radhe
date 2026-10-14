import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma, ensureDefaultData } from "@/lib/db";
import { createToken } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { decryptE2EEPayload } from "@/lib/e2ee-keys";

const loginSchema = z.object({
    identifier: z.string().min(1).optional(),
    username: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    usernameOrEmail: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
    encryptedPayload: z.string().optional(),
    e2ee: z.boolean().optional(),
});
export async function POST(req) {
    try {
        await ensureDefaultData();
        let body;
        try {
            body = await req.json();
        }
        catch {
            return NextResponse.json({ error: "Invalid request payload. Please send valid JSON." }, { status: 400 });
        }
        let parsed = loginSchema.parse(body);

        // If client sent an end-to-end encrypted payload, decrypt it server-side
        if (parsed.encryptedPayload) {
            const decrypted = decryptE2EEPayload(parsed.encryptedPayload);
            if (!decrypted || !decrypted.password) {
                return NextResponse.json({ error: "Secure login decryption failed or expired. Please refresh." }, { status: 400 });
            }
            parsed = {
                ...parsed,
                ...decrypted,
            };
        }

        if (!parsed.password) {
            return NextResponse.json({ error: "Password is required." }, { status: 400 });
        }
        const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            "127.0.0.1";
        const rawIdentifier = (parsed.identifier ||
            parsed.username ||
            parsed.email ||
            parsed.usernameOrEmail ||
            "").trim();
        if (!rawIdentifier) {
            return NextResponse.json({ error: "Please enter your username, email, or phone number." }, { status: 400 });
        }
        const identifierLower = rawIdentifier.toLowerCase();
        const rateLimitKey = `login:${clientIp}:${identifierLower}`;
        // Rate limit check: max 5 failed attempts per 1 minute window
        const rateStatus = checkRateLimit(rateLimitKey, 5, 60 * 1000);
        if (!rateStatus.allowed) {
            return NextResponse.json({ error: `Too many login attempts. Please try again in ${rateStatus.retryAfterSeconds} seconds.` }, {
                status: 429,
                headers: {
                    "Retry-After": String(rateStatus.retryAfterSeconds),
                },
            });
        }
        // Prepare phone number variants if digits entered
        const cleanPhone = rawIdentifier.replace(/[\s-]/g, "");
        const phoneVariants = [
            rawIdentifier,
            cleanPhone,
            cleanPhone.startsWith("+91") ? cleanPhone.slice(3) : `+91${cleanPhone}`,
        ];
        // Look up by username (case-insensitive or exact), email, or phone
        const user = await prisma.user.findFirst({
            where: {
                active: true,
                OR: [
                    { username: rawIdentifier },
                    { username: identifierLower },
                    { email: identifierLower },
                    { phone: { in: phoneVariants } },
                ],
            },
        });
        if (!user || !(await bcrypt.compare(parsed.password, user.password))) {
            return NextResponse.json({ error: "Invalid username/email or password." }, { status: 401 });
        }
        // Reset rate limit counter upon successful credentials verification
        resetRateLimit(rateLimitKey);
        const userWithEmail = user;
        const sessionUser = {
            id: user.id,
            username: user.username,
            email: userWithEmail.email ?? null,
            name: user.name,
            role: user.role,
        };
        const token = await createToken(sessionUser);
        const response = NextResponse.json({ user: sessionUser, token });
        response.cookies.set("radhe_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 8, // 8 hours
        });
        return response;
    }
    catch (err) {
        console.error("LOGIN_ERROR_DETAILS:", err);
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid email/username or password format." }, { status: 400 });
        }
        return NextResponse.json({ error: "Login failed. Please check server connection." }, { status: 500 });
    }
}
