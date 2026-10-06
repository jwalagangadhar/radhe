import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { getSession, type SessionUser } from "@/lib/auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function validateCsrf(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return true;

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return true;

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

export async function requireAuth(
  roles?: Role[],
  req?: Request
): Promise<SessionUser | NextResponse> {
  if (req && !validateCsrf(req)) {
    return jsonError("Cross-origin request rejected", 403);
  }

  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (roles && !roles.includes(session.role)) {
    return jsonError("Forbidden", 403);
  }
  return session;
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export async function getNextOrderNumber(): Promise<number> {
  const { prisma } = await import("@/lib/db");
  const last = await prisma.order.findFirst({
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  return (last?.orderNumber ?? 1000) + 1;
}
