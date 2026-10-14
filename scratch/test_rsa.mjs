import crypto from "crypto";

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

console.log("Public key generated successfully:");
console.log(publicKey.slice(0, 100) + "...");

// Test encrypt with public key
const secretMessage = JSON.stringify({ password: "admin123", timestamp: Date.now() });
const encryptedBuffer = crypto.publicEncrypt(
  {
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256",
  },
  Buffer.from(secretMessage, "utf8")
);

const cipherBase64 = encryptedBuffer.toString("base64");
console.log("Ciphertext (Base64):", cipherBase64.slice(0, 50) + "...");

// Test decrypt with private key
const decryptedBuffer = crypto.privateDecrypt(
  {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256",
  },
  Buffer.from(cipherBase64, "base64")
);

const decrypted = decryptedBuffer.toString("utf8");
console.log("Decrypted successfully:", decrypted);
if (decrypted !== secretMessage) throw new Error("Mismatch!");
console.log("RSA-OAEP 2048 E2EE TEST PASSED!");
