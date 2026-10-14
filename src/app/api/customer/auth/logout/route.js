import { NextResponse } from "next/server";
import { clearCustomerSessionCookie } from "@/lib/customer-auth";
export const runtime = "nodejs";
export async function POST() {
    await clearCustomerSessionCookie();
    return NextResponse.json({ success: true, message: "Logged out successfully" });
}
