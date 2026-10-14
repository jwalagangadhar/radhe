import { NextResponse } from "next/server";
export async function POST() {
    return NextResponse.json({ error: "IDFC webhook handler is disabled." }, { status: 404 });
}
