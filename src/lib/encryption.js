import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const PREFIX = "enc:v1:";

/**
 * Derives a consistent 32-byte key from environment secret.
 */
function getEncryptionKey() {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.JWT_SECRET ||
    "radhe-secure-e2e-encryption-secret-key-32b-salt-2026";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts plain text using AES-256-GCM authenticated encryption.
 * @param {string} text - Plain text to encrypt.
 * @returns {string} - Armored string format: enc:v1:<iv>:<authTag>:<ciphertext>
 */
export function encryptField(text) {
  if (!text || typeof text !== "string") return text;
  if (text.startsWith(PREFIX)) return text; // Already encrypted

  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${PREFIX}${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted armored string.
 * @param {string} encryptedText - Encrypted string.
 * @returns {string} - Decrypted plain text, or original text if not encrypted.
 */
export function decryptField(encryptedText) {
  if (!encryptedText || typeof encryptedText !== "string") return encryptedText;
  if (!encryptedText.startsWith(PREFIX)) return encryptedText; // Plain text fallback

  try {
    const parts = encryptedText.substring(PREFIX.length).split(":");
    if (parts.length !== 3) return encryptedText;

    const [ivHex, authTagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Field decryption failed:", err.message);
    return encryptedText;
  }
}

/**
 * Mask sensitive phone number for UI display and logs (e.g. +91 98*** **210).
 */
export function maskSensitivePhone(phone) {
  if (!phone || phone.length < 8) return phone;
  const decrypted = decryptField(phone);
  const start = decrypted.slice(0, decrypted.length - 6);
  const end = decrypted.slice(-2);
  return `${start}****${end}`;
}

/**
 * Mask sensitive email (e.g. j***@example.com).
 */
export function maskSensitiveEmail(email) {
  if (!email || !email.includes("@")) return email;
  const decrypted = decryptField(email);
  const [local, domain] = decrypted.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Produces an encrypted session payload object.
 */
export function encryptPayload(obj) {
  const jsonStr = JSON.stringify(obj);
  return encryptField(jsonStr);
}

/**
 * Decrypts an encrypted session payload object.
 */
export function decryptPayload(encryptedStr) {
  const jsonStr = decryptField(encryptedStr);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}
