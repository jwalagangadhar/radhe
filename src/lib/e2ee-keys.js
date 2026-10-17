import crypto from "crypto";
import fs from "fs";
import path from "path";

const KEYS_FILE = path.join(process.cwd(), ".e2ee-keys.json");

/**
 * Returns or generates the server's RSA-OAEP 2048-bit key pair.
 * Persisted to disk and cached in global memory so keys remain stable
 * across server restarts, Next.js hot-reloads, and re-compilations.
 */
export function getOrCreateE2EEKeyPair() {
  if (globalThis.__radhe_e2eeKeyPair) {
    return globalThis.__radhe_e2eeKeyPair;
  }

  // Try reading persisted keys from local file
  try {
    if (fs.existsSync(KEYS_FILE)) {
      const data = JSON.parse(fs.readFileSync(KEYS_FILE, "utf8"));
      if (data.publicKey && data.privateKey) {
        globalThis.__radhe_e2eeKeyPair = data;
        return data;
      }
    }
  } catch (err) {
    console.warn("Could not read .e2ee-keys.json, generating new keypair:", err.message);
  }

  // Generate new 2048-bit RSA key pair
  const generated = crypto.generateKeyPairSync("rsa", {
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

  try {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(generated, null, 2), "utf8");
  } catch (err) {
    console.warn("Could not save .e2ee-keys.json:", err.message);
  }

  globalThis.__radhe_e2eeKeyPair = generated;
  return generated;
}

/**
 * Returns the public key in PEM format for the client browser.
 */
export function getE2EEPublicKey() {
  const { publicKey } = getOrCreateE2EEKeyPair();
  return publicKey;
}

/**
 * Decrypts a base64-encoded RSA-OAEP payload sent from the browser.
 * Validates timestamp freshness to prevent replay attacks (10 minutes window).
 * @param {string} base64Cipher - The encrypted base64 string from the browser.
 * @returns {object|null} - Decrypted payload object, or null on failure.
 */
export function decryptE2EEPayload(base64Cipher) {
  if (!base64Cipher || typeof base64Cipher !== "string") return null;

  try {
    const { privateKey } = getOrCreateE2EEKeyPair();
    const decryptedBuffer = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(base64Cipher, "base64")
    );

    const jsonStr = decryptedBuffer.toString("utf8");
    const payload = JSON.parse(jsonStr);

    // Anti-replay check: ensure request was created within a reasonable 10-minute window
    if (payload.timestamp && typeof payload.timestamp === "number") {
      const now = Date.now();
      const ageMs = Math.abs(now - payload.timestamp);
      if (ageMs > 10 * 60 * 1000) {
        console.warn("E2EE payload rejected: timestamp expired", ageMs);
        return null;
      }
    }

    return payload;
  } catch (err) {
    console.error("E2EE decryption error:", err.message);
    return null;
  }
}
