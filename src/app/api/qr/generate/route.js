import { NextResponse } from "next/server";
export async function POST() {
    return NextResponse.json({ error: "IDFC QR generation is disabled." }, { status: 404 });
}
