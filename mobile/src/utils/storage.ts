import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "radhe_auth_token";
const USER_KEY = "radhe_session_user";

// In-memory fallback for web environment where native keychain isn't accessible
const memoryStorage: Record<string, string> = {};

export async function saveAuthToken(token: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      memoryStorage[TOKEN_KEY] = token;
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(TOKEN_KEY, token);
      }
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  } catch (error) {
    console.warn("SecureStore setItem failed, falling back to memory:", error);
    memoryStorage[TOKEN_KEY] = token;
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      if (memoryStorage[TOKEN_KEY]) return memoryStorage[TOKEN_KEY];
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(TOKEN_KEY);
      }
      return null;
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.warn("SecureStore getItem failed, falling back to memory:", error);
    return memoryStorage[TOKEN_KEY] || null;
  }
}

export async function removeAuthToken(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      delete memoryStorage[TOKEN_KEY];
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(TOKEN_KEY);
      }
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.warn("SecureStore deleteItem failed:", error);
    delete memoryStorage[TOKEN_KEY];
  }
}

export async function saveSessionUser(userJson: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      memoryStorage[USER_KEY] = userJson;
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(USER_KEY, userJson);
      }
      return;
    }
    await SecureStore.setItemAsync(USER_KEY, userJson);
  } catch (error) {
    memoryStorage[USER_KEY] = userJson;
  }
}

export async function getSessionUser(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      if (memoryStorage[USER_KEY]) return memoryStorage[USER_KEY];
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(USER_KEY);
      }
      return null;
    }
    return await SecureStore.getItemAsync(USER_KEY);
  } catch (error) {
    return memoryStorage[USER_KEY] || null;
  }
}

export async function removeSessionUser(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      delete memoryStorage[USER_KEY];
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(USER_KEY);
      }
      return;
    }
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (error) {
    delete memoryStorage[USER_KEY];
  }
}
