"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { CartItem } from "@/lib/types";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { user, openAuthModal } = useCustomerAuth();
  const pendingItemRef = useRef<Omit<CartItem, "quantity"> | null>(null);

  // Clear cart items when user logs out
  useEffect(() => {
    if (!user) {
      setItems([]);
    }
  }, [user]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">) => {
      // Require customer mobile OTP login before adding anything to cart
      if (!user) {
        pendingItemRef.current = item;
        openAuthModal("/cart");
        return;
      }

      if (item.stock <= 0) return;

      setItems((prev) => {
        const existing = prev.find((i) => i.productId === item.productId);
        if (existing) {
          if (existing.quantity >= item.stock) return prev;
          return prev.map((i) =>
            i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        return [...prev, { ...item, quantity: 1 }];
      });
    },
    [user, openAuthModal]
  );

  // Automatically add pending item once user finishes logging in
  useEffect(() => {
    if (user && pendingItemRef.current) {
      const item = pendingItemRef.current;
      pendingItemRef.current = null;
      addItem(item);
    }
  }, [user, addItem]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (!existing) return prev;

      if (quantity <= 0) {
        return prev.filter((i) => i.productId !== productId);
      }

      const nextQuantity = Math.min(Math.max(1, quantity), existing.stock);
      return prev.map((i) => (i.productId === productId ? { ...i, quantity: nextQuantity } : i));
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
