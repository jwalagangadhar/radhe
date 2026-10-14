import crypto from "crypto";
const { subtle } = crypto.webcrypto;

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

// Convert PEM to ArrayBuffer (exact same code that runs in browser)
function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/, "")
    .replace(/-----END [A-Z ]+-----/, "")
    .replace(/\s/g, "");
  return Buffer.from(b64, "base64");
}

async function testWebCrypto() {
  const spkiBuffer = pemToArrayBuffer(publicKey);
  
  // Browser imports public key
  const importedKey = await subtle.importKey(
    "spki",
    spkiBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  );

  const payload = JSON.stringify({ identifier: "admin", password: "admin123", timestamp: Date.now() });
  const encoded = new TextEncoder().encode(payload);

  // Browser encrypts with RSA-OAEP SHA-256
  const encryptedBuf = await subtle.encrypt(
    { name: "RSA-OAEP" },
    importedKey,
    encoded
  );

  const base64Encrypted = Buffer.from(encryptedBuf).toString("base64");
  console.log("Browser encrypted base64:", base64Encrypted.slice(0, 50) + "...");

  // Server decrypts with Node crypto
  const decryptedBuf = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(base64Encrypted, "base64")
  );

  const result = decryptedBuf.toString("utf8");
  console.log("Server decrypted successfully:", result);
  if (result !== payload) throw new Error("Mismatch in webcrypto test!");
  console.log("BROWSER-TO-SERVER ASYMMETRIC E2EE VERIFIED 100%!");
}

testWebCrypto().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
