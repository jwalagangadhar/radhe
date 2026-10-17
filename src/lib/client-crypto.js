let cachedCryptoKey = null;

/**
 * Clears any in-memory cached public key.
 */
export function clearClientCryptoKey() {
  cachedCryptoKey = null;
}

/**
 * Converts a PEM-formatted SPKI public key string to an ArrayBuffer.
 */
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

/**
 * Retrieves and caches the server's RSA-OAEP public key.
 * @param {boolean} forceRefresh - If true, ignores cache and fetches fresh key from server.
 */
export async function getClientPublicKey(forceRefresh = false) {
  if (cachedCryptoKey && !forceRefresh) return cachedCryptoKey;

  try {
    const url = forceRefresh ? `/api/auth/e2ee-key?_t=${Date.now()}` : "/api/auth/e2ee-key";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch public key");
    const data = await res.json();
    const spkiBuffer = pemToArrayBuffer(data.publicKey);

    cachedCryptoKey = await window.crypto.subtle.importKey(
      "spki",
      spkiBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["encrypt"]
    );
    return cachedCryptoKey;
  } catch (err) {
    console.error("Failed to initialize client encryption key:", err);
    cachedCryptoKey = null;
    return null;
  }
}

/**
 * Encrypts sensitive login credentials using browser native WebCrypto (RSA-OAEP 2048-bit).
 * @param {object} credentials - e.g. { identifier, password }
 * @param {boolean} forceRefreshKey - If true, fetches a fresh key before encrypting
 * @returns {Promise<object>} - Encrypted payload or fallback
 */
export async function encryptLoginCredentials(credentials, forceRefreshKey = false) {
  try {
    if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
      return credentials; // Fallback for unsupported environments
    }

    const key = await getClientPublicKey(forceRefreshKey);
    if (!key) {
      return credentials;
    }

    const payloadObj = {
      ...credentials,
      timestamp: Date.now(),
    };

    const encoded = new TextEncoder().encode(JSON.stringify(payloadObj));
    const encryptedBuf = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      key,
      encoded
    );

    // Convert encrypted ArrayBuffer to Base64
    const bytes = new Uint8Array(encryptedBuf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Encrypted = btoa(binary);

    return {
      encryptedPayload: base64Encrypted,
      e2ee: true,
    };
  } catch (err) {
    console.error("Client encryption error, falling back:", err);
    return credentials;
  }
}
