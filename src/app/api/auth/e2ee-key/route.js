import { NextResponse } from "next/server";
import { getE2EEPublicKey } from "@/lib/e2ee-keys";

export async function GET() {
  const publicKey = getE2EEPublicKey();
  return NextResponse.json({
    publicKey,
    algorithm: "RSA-OAEP-256",
  }, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
