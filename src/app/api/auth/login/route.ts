import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma, ensureDefaultData } from "@/lib/db";
import { createToken, setSessionCookie } from "@/lib/auth";

import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  identifier: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  usernameOrEmail: z.string().min(1).optional(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultData();
    const body = await req.json();
    const parsed = loginSchema.parse(body);

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rawIdentifier = (
      parsed.identifier ||
      parsed.username ||
      parsed.email ||
      parsed.usernameOrEmail ||
      ""
    ).trim();
    if (!rawIdentifier) {
      return NextResponse.json({ error: "Invalid email/username or password." }, { status: 401 });
    }

    const identifierLower = rawIdentifier.toLowerCase();
    const rateLimitKey = `login:${clientIp}:${identifierLower}`;

    // Rate limit check: max 5 failed attempts per 1 minute window
    const rateStatus = checkRateLimit(rateLimitKey, 5, 60 * 1000);
    if (!rateStatus.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${rateStatus.retryAfterSeconds} seconds.` },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateStatus.retryAfterSeconds),
          },
        }
      );
    }

    // Look up by username (case-insensitive or exact) or email
    const user = await prisma.user.findFirst({
      where: {
        active: true,
        OR: [
          { username: rawIdentifier },
          { username: identifierLower },
          { email: identifierLower } as any,
        ],
      },
    });

    if (!user || !(await bcrypt.compare(parsed.password, user.password))) {
      return NextResponse.json({ error: "Invalid email/username or password." }, { status: 401 });
    }

    // Reset rate limit counter upon successful credentials verification
    resetRateLimit(rateLimitKey);

    const userWithEmail = user as typeof user & { email?: string | null };

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
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email/username or password." }, { status: 400 });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}


