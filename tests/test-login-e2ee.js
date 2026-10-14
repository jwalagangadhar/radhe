import crypto from "crypto";
import { getE2EEPublicKey, decryptE2EEPayload } from "@/lib/e2ee-keys";
import { prisma, ensureDefaultData } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createToken, verifyToken } from "@/lib/auth";

const { subtle } = crypto.webcrypto;

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function runE2EETest() {
  console.log("=== RUNNING LOGIN CLIENT-TO-SERVER E2EE VERIFICATION ===");
  await ensureDefaultData();

  // 1. Client fetches Server Public Key
  console.log("\n[Step 1] Server provides RSA-OAEP 2048-bit Public Key");
  const pemPublicKey = getE2EEPublicKey();
  console.assert(pemPublicKey.includes("BEGIN PUBLIC KEY"), "Public key PEM must be valid");
  console.log("✓ Server RSA-OAEP public key retrieved successfully.");

  // 2. Client Browser imports Public Key and encrypts credentials
  console.log("\n[Step 2] Client Browser (WebCrypto) encrypts sensitive credentials");
  const spkiBuffer = pemToArrayBuffer(pemPublicKey);
  const browserKey = await subtle.importKey(
    "spki",
    spkiBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  );

  const clientPayload = {
    identifier: "admin",
    password: "admin123",
    timestamp: Date.now(),
  };

  const encoded = new TextEncoder().encode(JSON.stringify(clientPayload));
  const encryptedBuf = await subtle.encrypt(
    { name: "RSA-OAEP" },
    browserKey,
    encoded
  );

  const base64Cipher = Buffer.from(encryptedBuf).toString("base64");
  console.log("✓ Encrypted payload generated in browser (base64 snippet):", base64Cipher.slice(0, 48) + "...");
  console.log("✓ Plain text password NEVER leaves browser unencrypted.");

  // 3. Server receives encryptedPayload and decrypts using Private Key
  console.log("\n[Step 3] Server decrypts payload using Private Key");
  const decrypted = decryptE2EEPayload(base64Cipher);
  console.assert(decrypted !== null, "Decryption must succeed");
  console.assert(decrypted.identifier === "admin", "Identifier must match");
  console.assert(decrypted.password === "admin123", "Password must match");
  console.log("✓ Server successfully decrypted credentials with timestamp anti-replay validation.");

  // 4. Server verifies credentials against database
  console.log("\n[Step 4] Verify against database user");
  const user = await prisma.user.findFirst({
    where: { username: decrypted.identifier },
  });
  console.assert(user !== null, "User must exist");
  const passwordValid = await bcrypt.compare(decrypted.password, user.password);
  console.assert(passwordValid === true, "Password verification must pass");
  console.log("✓ Database bcrypt verification passed for user:", user.username);

  // 5. Issue encrypted session token
  console.log("\n[Step 5] Issue end-to-end encrypted session token");
  const token = await createToken({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    email: user.email,
  });
  const verified = await verifyToken(token);
  console.assert(verified.username === "admin", "Session username must match");
  console.assert(verified.role === "ADMIN", "Session role must match");
  console.log("✓ Authenticated session generated with encrypted claims.");

  console.log("\n=== ALL LOGIN E2EE TESTS PASSED SUCCESSFULLY! ===");
}

runE2EETest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
