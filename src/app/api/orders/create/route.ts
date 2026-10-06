import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "IDFC payment integration is disabled." }, { status: 404 });
}
