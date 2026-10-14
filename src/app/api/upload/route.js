import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import { requireAuth } from "@/lib/api";
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
/**
 * Validates file magic bytes to prevent MIME and extension spoofing (e.g. polyglot files or stored XSS).
 */
function isValidImageSignature(buffer) {
    if (buffer.length < 12) {
        return { valid: false, ext: "" };
    }
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { valid: true, ext: "jpg" };
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a) {
        return { valid: true, ext: "png" };
    }
    // WEBP: "RIFF" .... "WEBP"
    const isRiff = buffer.toString("ascii", 0, 4) === "RIFF";
    const isWebp = buffer.toString("ascii", 8, 12) === "WEBP";
    if (isRiff && isWebp) {
        return { valid: true, ext: "webp" };
    }
    return { valid: false, ext: "" };
}
export async function POST(request) {
    const auth = await requireAuth(["ADMIN"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        const formData = await request.formData();
        const file = formData.get("file");
        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }
        // 1. File size limit (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
        }
        // 2. MIME type check
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return NextResponse.json({ error: "Invalid file format. Only JPEG, PNG, and WebP images are allowed." }, { status: 400 });
        }
        // 3. Extension check
        const rawExt = (file.name.split(".").pop() || "").toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(rawExt)) {
            return NextResponse.json({ error: "Disallowed file extension. Only .jpg, .png, and .webp are accepted." }, { status: 400 });
        }
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        // 4. Magic byte inspection
        const signature = isValidImageSignature(buffer);
        if (!signature.valid) {
            return NextResponse.json({ error: "Corrupted or spoofed image file rejected." }, { status: 400 });
        }
        // 5. Generate secure, cryptographically random filename (prevent path traversal / XSS)
        const randomHex = crypto.randomBytes(16).toString("hex");
        const safeFilename = `product-${Date.now()}-${randomHex}.${signature.ext}`;
        const uploadsDir = join(process.cwd(), "public", "uploads");
        await mkdir(uploadsDir, { recursive: true });
        await writeFile(join(uploadsDir, safeFilename), buffer);
        return NextResponse.json({ url: `/uploads/${safeFilename}` });
    }
    catch (err) {
        console.error("Upload error:", err);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}
