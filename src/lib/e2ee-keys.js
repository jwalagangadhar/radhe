import crypto from "crypto";

let cachedKeyPair = null;

/**
 * Returns or generates the server's RSA-OAEP 2048-bit key pair.
 * The private key stays strictly on the server and is never exposed.
 */
export function getOrCreateE2EEKeyPair() {
  if (!cachedKeyPair) {
    cachedKeyPair = crypto.generateKeyPairSync("rsa", {
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
  }
  return cachedKeyPair;
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
 * Validates timestamp freshness to prevent replay attacks (max 3 minutes window).
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

    // Anti-replay check: ensure request was created within the last 3 minutes
    if (payload.timestamp && typeof payload.timestamp === "number") {
      const now = Date.now();
      const ageMs = Math.abs(now - payload.timestamp);
      if (ageMs > 3 * 60 * 1000) {
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
