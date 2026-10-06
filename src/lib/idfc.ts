import crypto from "crypto";

const IDFC_ENV = process.env.IDFC_ENV ?? "SANDBOX";
const IDFC_BASE_URL = process.env.IDFC_BASE_URL ?? "https://api.idfcfirstbank.com/pg/v1";
const IDFC_MERCHANT_ID = process.env.IDFC_MERCHANT_ID ?? "";
const IDFC_TERMINAL_ID = process.env.IDFC_TERMINAL_ID ?? "";
const IDFC_CLIENT_ID = process.env.IDFC_CLIENT_ID ?? "";
const IDFC_CLIENT_SECRET = process.env.IDFC_CLIENT_SECRET ?? "";

export type IdfcOrderSessionPayload = {
  amount: number;
  currency: "INR";
  orderReferenceId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress: string;
  redirectUrl: string;
  terminalId?: string;
  merchantId?: string;
  productDescription?: string;
};

export type IdfcQrPayload = {
  amount: number;
  currency: "INR";
  transactionRef: string;
  payeeUpiId: string;
  payeeName: string;
  transactionNote?: string;
};

export type IdfcOrderSessionResponse = {
  paymentUrl: string;
  sessionId: string;
  orderReferenceId: string;
  expiresAt?: string;
  payload?: any;
};

function getBaseUrl() {
  return IDFC_BASE_URL;
}

function buildSignature(path: string, body: string, timestamp: string) {
  const raw = `${path}|${body}|${timestamp}`;
  return crypto.createHmac("sha256", IDFC_CLIENT_SECRET).update(raw).digest("hex");
}

function createHeaders(path: string, body: unknown) {
  const rawBody = body ? JSON.stringify(body) : "";
  const timestamp = new Date().toISOString();
  const signature = buildSignature(path, rawBody, timestamp);

  return {
    "Content-Type": "application/json",
    "x-api-key": IDFC_MERCHANT_ID,
    "x-client-id": IDFC_CLIENT_ID,
    "x-request-timestamp": timestamp,
    "x-signature": signature,
    "x-terminal-id": IDFC_TERMINAL_ID,
    "x-idfc-env": IDFC_ENV,
  } as Record<string, string>;
}

export async function createIdfcOrderSession(
  payload: IdfcOrderSessionPayload
): Promise<IdfcOrderSessionResponse> {
  const path = "/orders/create";
  const url = `${getBaseUrl()}${path}`;
  const headers = createHeaders(path, payload);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`IDFC order creation failed: ${response.status} ${body}`);
  }

  const json = (await response.json()) as IdfcOrderSessionResponse;
  return json;
}

export async function createIdfcDynamicQr(
  payload: IdfcQrPayload
): Promise<string> {
  const path = "/qr/generate";
  const url = `${getBaseUrl()}${path}`;
  const headers = createHeaders(path, payload);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`IDFC QR generation failed: ${response.status} ${body}`);
  }

  const json = await response.json();
  if (typeof json.qrImage !== "string") {
    throw new Error("Invalid QR response from IDFC");
  }

  return json.qrImage;
}

export function verifyIdfcWebhook(signatureHeader: string | null, timestamp: string | null, rawBody: string) {
  if (!signatureHeader || !timestamp) {
    return false;
  }

  const expected = buildSignature("/webhooks/idfc", rawBody, timestamp);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signatureHeader, "hex"));
  } catch {
    return false;
  }
}

export function buildIdfcRedirectUrl(orderNumber: number, invoiceNumber: string) {
  return `${process.env.APP_BASE_URL ?? "https://example.com"}/order-success?orderNumber=${encodeURIComponent(
    String(orderNumber)
  )}&invoice=${encodeURIComponent(invoiceNumber)}`;
}
