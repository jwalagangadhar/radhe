import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "radhe_session";
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "radhe-grocery-change-this-in-production"
);

interface SessionPayload {
  id: string;
  username: string;
  role: "ADMIN" | "WORKER";
  name?: string;
  email?: string | null;
}

// CORS configuration for the mobile Expo web app
const allowedOrigins = ["http://localhost:8081"];
const corsOptions: Record<string, string> = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
};

function addCorsHeaders(response: NextResponse, origin: string) {
  if (allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  Object.entries(corsOptions).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin") ?? "";

  // Handle CORS for API routes — allows the Expo mobile web app to call the backend
  if (pathname.startsWith("/api/")) {
    const isAllowedOrigin = allowedOrigins.includes(origin);

    // Handle preflight OPTIONS requests
    if (request.method === "OPTIONS") {
      const preflightHeaders: Record<string, string> = {
        ...(isAllowedOrigin && { "Access-Control-Allow-Origin": origin }),
        ...corsOptions,
      };
      return NextResponse.json({}, { headers: preflightHeaders });
    }

    // For non-preflight API requests, add CORS headers and continue
    const response = NextResponse.next();
    if (isAllowedOrigin) {
      return addCorsHeaders(response, origin);
    }
    return response;
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  let session: SessionPayload | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      session = payload as unknown as SessionPayload;
    } catch {
      session = null;
    }
  }

  // 1. Base /portal root path
  if (pathname === "/portal" || pathname === "/portal/") {
    if (!session) {
      return NextResponse.redirect(new URL("/portal/login", request.url));
    }
    if (session.role === "ADMIN") {
      return NextResponse.redirect(new URL("/portal/admin", request.url));
    }
    return NextResponse.redirect(new URL("/portal/worker", request.url));
  }

  // 2. /portal/login - Allow visiting login page anytime (for demos, account switching, or re-authentication)
  if (pathname === "/portal/login" || pathname === "/portal/login/") {
    return NextResponse.next();
  }

  // 3. /portal/access-denied
  if (pathname === "/portal/access-denied" || pathname === "/portal/access-denied/") {
    if (!session) {
      return NextResponse.redirect(new URL("/portal/login", request.url));
    }
    return NextResponse.next();
  }

  // 4. /portal/admin and all admin subroutes
  if (pathname.startsWith("/portal/admin")) {
    if (!session) {
      const loginUrl = new URL("/portal/login", request.url);
      loginUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/portal/access-denied", request.url));
    }
    return NextResponse.next();
  }

  // 5. /portal/worker and all worker subroutes
  if (pathname.startsWith("/portal/worker")) {
    if (!session) {
      const loginUrl = new URL("/portal/login", request.url);
      loginUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Worker portal is allowed for WORKER and ADMIN
    return NextResponse.next();
  }

  // 6. Legacy and direct /admin routes
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!session) {
      const loginUrl = new URL("/portal/login", request.url);
      loginUrl.searchParams.set("returnUrl", "/portal/admin");
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/portal/access-denied", request.url));
    }
    return NextResponse.redirect(new URL("/portal/admin", request.url));
  }

  // 7. Legacy and direct /worker routes
  if (pathname === "/worker" || pathname.startsWith("/worker/")) {
    if (!session) {
      const loginUrl = new URL("/portal/login", request.url);
      loginUrl.searchParams.set("returnUrl", "/portal/worker");
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.redirect(new URL("/portal/worker", request.url));
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    "/api/:path*",
    "/portal",
    "/portal/:path*",
    "/admin",
    "/admin/:path*",
    "/worker",
    "/worker/:path*",
  ],
};

