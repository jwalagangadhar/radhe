import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { SessionUser } from "../types/models";
import { loginApi, logoutApi, getMeApi } from "../api/auth";
import { getSessionUser, saveSessionUser, removeSessionUser, removeAuthToken } from "../utils/storage";
import { setOnAuthExpired } from "../api/client";

interface AuthContextType {
  user: SessionUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<SessionUser | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {
    throw new Error("AuthContext not initialized");
  },
  logout: async () => {},
  refreshUser: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session from SecureStore on startup and verify with server
  const initAuth = useCallback(async () => {
    try {
      const cached = await getSessionUser();
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as SessionUser;
          setUser(parsed);
        } catch {
          // ignore corrupted cache
        }
      }

      // Verify token freshness against server /api/auth/me
      const serverUser = await getMeApi();
      if (serverUser) {
        setUser(serverUser);
        await saveSessionUser(JSON.stringify(serverUser));
      } else if (cached) {
        // Token invalid or expired on server
        setUser(null);
        await removeAuthToken();
        await removeSessionUser();
      }
    } catch {
      // Offline fallback: keep cached user if network is unavailable
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();

    // Handle 401 session expiration from any API call
    setOnAuthExpired(() => {
      setUser(null);
    });
  }, [initAuth]);

  const login = async (identifier: string, password: string): Promise<SessionUser> => {
    setIsLoading(true);
    try {
      const sessionUser = await loginApi(identifier, password);
      setUser(sessionUser);
      return sessionUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<SessionUser | null> => {
    const freshUser = await getMeApi();
    if (freshUser) {
      setUser(freshUser);
      await saveSessionUser(JSON.stringify(freshUser));
    }
    return freshUser;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
