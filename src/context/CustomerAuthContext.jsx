"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
const CustomerAuthContext = createContext(undefined);
export function CustomerAuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authReturnUrl, setAuthReturnUrl] = useState(null);
    const refreshUser = useCallback(async () => {
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
        }
        catch {
            setUser(null);
            return null;
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        refreshUser();
    }, [refreshUser]);
    const openAuthModal = useCallback((returnUrl) => {
        if (returnUrl)
            setAuthReturnUrl(returnUrl);
        setIsAuthModalOpen(true);
    }, []);
    const closeAuthModal = useCallback(() => {
        setIsAuthModalOpen(false);
        setAuthReturnUrl(null);
    }, []);
    const logout = useCallback(async () => {
        try {
            await fetch("/api/customer/auth/logout", { method: "POST" });
        }
        finally {
            setUser(null);
            window.location.href = "/";
        }
    }, []);
    return (<CustomerAuthContext.Provider value={{
            user,
            loading,
            isAuthModalOpen,
            authReturnUrl,
            openAuthModal,
            closeAuthModal,
            refreshUser,
            logout,
        }}>
      {children}
    </CustomerAuthContext.Provider>);
}
export function useCustomerAuth() {
    const context = useContext(CustomerAuthContext);
    if (!context) {
        throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
    }
    return context;
}
