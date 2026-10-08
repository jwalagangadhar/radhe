import { apiClient } from "./client";
import { SessionUser } from "../types/models";
import { saveAuthToken, saveSessionUser, removeAuthToken, removeSessionUser } from "../utils/storage";

export interface LoginResponse {
  user: SessionUser;
  token?: string;
  error?: string;
}

export interface MeResponse {
  user: SessionUser | null;
}

/**
 * Authenticates user credentials with existing Next.js backend.
 * Saves the issued JWT token securely into Expo SecureStore.
 */
export async function loginApi(identifier: string, password: string): Promise<SessionUser> {
  const result = await apiClient<LoginResponse>("/api/auth/login", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ identifier, password }),
  });

  if (!result.user) {
    throw new Error(result.error || "Authentication failed");
  }

  if (result.token) {
    await saveAuthToken(result.token);
  }
  await saveSessionUser(JSON.stringify(result.user));

  return result.user;
}

/**
 * Validates the current session token with /api/auth/me.
 */
export async function getMeApi(): Promise<SessionUser | null> {
  try {
    const result = await apiClient<MeResponse>("/api/auth/me");
    return result.user;
  } catch (error) {
    return null;
  }
}

/**
 * Invalidate server session and clears local credentials.
 */
export async function logoutApi(): Promise<void> {
  try {
    await apiClient<{ ok: boolean }>("/api/auth/logout", {
      method: "POST",
    });
  } catch (err) {
    // If offline or already unauthenticated, still clear local storage
  } finally {
    await removeAuthToken();
    await removeSessionUser();
  }
}

export interface SendOtpResponse {
  success: boolean;
  message?: string;
  cooldownSeconds?: number;
  expiresInSeconds?: number;
  isSimulated?: boolean;
  simulatedOtp?: string;
  error?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  token?: string;
  message?: string;
  isFirstLogin?: boolean;
  user?: {
    id: string;
    name?: string | null;
    phone: string;
    email?: string | null;
    phoneVerified?: boolean;
  };
  error?: string;
}

/**
 * Sends a 6-digit OTP to customer mobile number.
 */
export async function sendCustomerOtpApi(phone: string, countryCode = "+91"): Promise<SendOtpResponse> {
  return await apiClient<SendOtpResponse>("/api/customer/auth/send-otp", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ phone, countryCode, purpose: "LOGIN" }),
  });
}

/**
 * Verifies 6-digit OTP and authenticates customer on mobile device.
 */
export async function verifyCustomerOtpApi(
  phone: string,
  otp: string,
  countryCode = "+91",
  name?: string
): Promise<VerifyOtpResponse> {
  const result = await apiClient<VerifyOtpResponse>("/api/customer/auth/verify-otp", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ phone, otp, countryCode, name }),
  });

  if (result.token) {
    await saveAuthToken(result.token);
  }
  if (result.user) {
    const sessionUser: SessionUser = {
      id: result.user.id,
      username: result.user.phone,
      email: result.user.email || null,
      name: result.user.name || "Customer",
      role: "CUSTOMER" as any,
    };
    await saveSessionUser(JSON.stringify(sessionUser));
  }

  return result;
}

