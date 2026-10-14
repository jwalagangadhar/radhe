import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
export async function POST() {
    await clearSessionCookie();
    const response = NextResponse.json({ ok: true });
    response.cookies.set("radhe_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
    });
    return response;
}
export async function GET(req) {
    await clearSessionCookie();
    const url = new URL("/portal/login", req.url);
    const response = NextResponse.redirect(url);
    response.cookies.set("radhe_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
    });
    return response;
}
