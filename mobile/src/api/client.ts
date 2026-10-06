import { getAuthToken, removeAuthToken, removeSessionUser } from "../utils/storage";

// Default to configured environment variable or fallback for development
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || "http://10.70.58.209:3000"
).replace(/\/$/, "");

export interface ApiError {
  message: string;
  status?: number;
  isNetworkError?: boolean;
  isAuthError?: boolean;
}

type AuthExpiredCallback = () => void;
let onAuthExpiredHandler: AuthExpiredCallback | null = null;

export function setOnAuthExpired(callback: AuthExpiredCallback) {
  onAuthExpiredHandler = callback;
}

export class ApiException extends Error implements ApiError {
  status?: number;
  isNetworkError?: boolean;
  isAuthError?: boolean;

  constructor(message: string, status?: number, isNetworkError = false, isAuthError = false) {
    super(message);
    this.name = "ApiException";
    this.status = status;
    this.isNetworkError = isNetworkError;
    this.isAuthError = isAuthError;
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  skipAuth?: boolean;
}

/**
 * Central API fetch wrapper with timeout, SecureStore token injection,
 * and comprehensive offline/server failure handling.
 */
export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 15000, skipAuth = false, headers: customHeaders, ...restOptions } = options;

  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  // Attach token from SecureStore if not explicitly skipped
  const headers = new Headers(customHeaders || {});
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  if (!skipAuth) {
    const token = await getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      headers.set("Cookie", `radhe_session=${token}`);
    }
  }

  // Network timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle session expiration
    if (response.status === 401) {
      await removeAuthToken();
      await removeSessionUser();
      if (onAuthExpiredHandler) {
        onAuthExpiredHandler();
      }
      throw new ApiException("Session expired. Please log in again.", 401, false, true);
    }

    // Handle forbidden role violation
    if (response.status === 403) {
      let errorMessage = "Access denied: You do not have permission to perform this action.";
      try {
        const data = await response.json();
        if (data.error) errorMessage = data.error;
      } catch {
        // use default message
      }
      throw new ApiException(errorMessage, 403, false, false);
    }

    if (!response.ok) {
      let errorMsg = `Server responded with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMsg = errorData.error;
      } catch {
        // use status text if JSON parse fails
        if (response.statusText) errorMsg = response.statusText;
      }
      throw new ApiException(errorMsg, response.status, false, false);
    }

    // Try parsing JSON response
    const json = await response.json();
    return json as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof ApiException) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new ApiException(
        "Request timed out. Please check your connection and try again.",
        408,
        true,
        false
      );
    }

    // Generic fetch failed (network down, host unreachable, connection refused)
    const rawMsg = error.message || "";
    if (
      rawMsg.includes("Network request failed") ||
      rawMsg.includes("Failed to fetch") ||
      rawMsg.includes("ECONNREFUSED") ||
      rawMsg.includes("ENOTFOUND")
    ) {
      throw new ApiException(
        "Server unavailable. Please verify your network connection and server status.",
        0,
        true,
        false
      );
    }

    throw new ApiException(error.message || "An unexpected error occurred", 500);
  }
}
