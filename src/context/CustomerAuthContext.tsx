"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface CustomerUser {
  id: string;
  name: string;
  phone: string;
  phoneVerified: boolean;
  email?: string | null;
  status: string;
  createdAt?: string;
  orderCount?: number;
  addressCount?: number;
}

interface CustomerAuthContextType {
  user: CustomerUser | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authReturnUrl: string | null;
  openAuthModal: (returnUrl?: string) => void;
  closeAuthModal: () => void;
  refreshUser: () => Promise<CustomerUser | null>;
  logout: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authReturnUrl, setAuthReturnUrl] = useState<string | null>(null);

  const refreshUser = useCallback(async (): Promise<CustomerUser | null> => {
    try {
      const res = await fetch("/api/customer/auth/me", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          return data.user;
        }
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const openAuthModal = useCallback((returnUrl?: string) => {
    if (returnUrl) setAuthReturnUrl(returnUrl);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthReturnUrl(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/customer/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      window.location.href = "/";
    }
  }, []);

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        loading,
        isAuthModalOpen,
        authReturnUrl,
        openAuthModal,
        closeAuthModal,
        refreshUser,
        logout,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
  }
  return context;
}
