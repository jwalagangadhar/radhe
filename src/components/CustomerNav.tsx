"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/about", label: "About", icon: "🌾" },
  { href: "/products", label: "Products", icon: "🛍️" },
  { href: "/track", label: "Track Order", icon: "📦" },
];

export function CustomerNav() {
  const pathname = usePathname();
  const { items } = useCart();
  const { user, openAuthModal, logout } = useCustomerAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileMenuOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-amber-100 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:py-3">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Radhe Wholesale - Home">
          <Image
            src="/logo.png"
            alt="Rajyalakshmi Radhe"
            width={120}
            height={75}
            className="h-10 w-auto object-contain sm:h-12 md:h-14"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-6" aria-label="Desktop navigation">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold transition-colors ${
                  isActive ? "text-amber-700 font-bold" : "text-zinc-700 hover:text-amber-600"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Desktop Cart Button */}
          {user ? (
            <Link
              href="/cart"
              className="relative flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition-all"
              aria-label={`Cart with ${itemCount} items`}
            >
              <span>🛒</span>
              <span>Cart</span>
              {itemCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-black text-amber-700">
                  {itemCount}
                </span>
              )}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal("/cart")}
              className="relative flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition-all cursor-pointer"
              aria-label="Login to access Cart"
            >
              <span>🛒</span>
              <span>Cart</span>
            </button>
          )}

          {/* Customer Authentication / My Account Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/account"
                className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-bold transition-all ${
                  pathname.startsWith("/account")
                    ? "border-amber-600 bg-amber-50 text-amber-950"
                    : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-amber-400 hover:bg-amber-50/50"
                }`}
              >
                <span>👤</span>
                <span className="max-w-[120px] truncate">{user.name || user.phone}</span>
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="flex items-center gap-1.5 rounded-full border border-amber-600/30 bg-amber-50/70 px-4 py-2 text-sm font-bold text-amber-900 shadow-xs hover:bg-amber-100 hover:border-amber-600 active:scale-95 transition-all cursor-pointer"
            >
              <span>👤</span>
              <span>Login / Sign Up</span>
            </button>
          )}

          {/* Desktop Staff Portal Link */}
          <Link
            href="/portal/login"
            className="text-xs font-semibold text-zinc-400 hover:text-amber-700 transition-colors border-l border-zinc-200 pl-4 py-1"
          >
            Staff Portal →
          </Link>
        </nav>

        {/* Mobile Action Controls (Login / User + Cart + Hamburger) */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile Login / Account Quick Button */}
          {user ? (
            <Link
              href="/account"
              className="flex h-11 items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 text-xs font-bold text-amber-950 active:scale-95 transition"
              aria-label="My Account"
            >
              <span>👤</span>
              <span className="max-w-[65px] truncate">{user.name?.split(" ")[0] || "Account"}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="flex h-11 items-center gap-1 rounded-xl border border-amber-200 bg-amber-50/80 px-2.5 text-xs font-bold text-amber-900 active:scale-95 transition cursor-pointer"
            >
              <span>👤</span>
              <span>Login</span>
            </button>
          )}

          {/* Mobile Quick Cart Button */}
          {user ? (
            <Link
              href="/cart"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-900 active:scale-95 transition-transform"
              aria-label={`Shopping Cart with ${itemCount} items`}
            >
              <span className="text-xl">🛒</span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-600 px-1 text-[11px] font-black text-white shadow-xs">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal("/cart")}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-900 active:scale-95 transition-transform cursor-pointer"
              aria-label="Login to access Cart"
            >
              <span className="text-xl">🛒</span>
            </button>
          )}

          {/* Hamburger Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-xs hover:bg-zinc-50 active:scale-95 transition-all"
          >
            {mobileMenuOpen ? (
              <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop & Slide-over Navigation */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          className="fixed inset-0 z-50 md:hidden flex justify-end animate-in fade-in duration-200"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative z-10 flex h-full w-[85vw] max-w-sm flex-col bg-white shadow-2xl transition-transform animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-amber-100 p-4 bg-amber-50/50">
              <div className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="Radhe Wholesale"
                  width={90}
                  height={50}
                  className="h-9 w-auto object-contain"
                />
                <div>
                  <p className="text-xs font-black text-amber-950 uppercase tracking-wider">Rajyalakshmi Radhe</p>
                  <p className="text-[10px] text-amber-800">Vijayawada Wholesale &amp; Retail</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 active:scale-95 transition"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {/* Mobile Account Banner */}
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/60">
              {user ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-zinc-900 truncate">{user.name || "Customer"}</p>
                    <p className="text-[11px] text-zinc-500 font-mono">{user.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 transition"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal();
                  }}
                  className="w-full rounded-xl bg-amber-600 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <span>👤</span>
                  <span>Login / Sign Up with Mobile OTP</span>
                </button>
              )}
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1.5" aria-label="Mobile menu">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 text-base font-bold transition-all min-h-[48px] ${
                      isActive
                        ? "bg-amber-500 text-zinc-950 shadow-sm"
                        : "text-zinc-800 hover:bg-zinc-100 active:bg-zinc-200"
                    }`}
                  >
                    <span className="text-xl" aria-hidden="true">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              {/* Mobile Cart Link with Badge */}
              {user ? (
                <Link
                  href="/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-base font-bold transition-all min-h-[48px] ${
                    pathname === "/cart"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-amber-50/80 text-amber-950 border border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-xl" aria-hidden="true">🛒</span>
                    <span>Your Cart</span>
                  </div>
                  {itemCount > 0 ? (
                    <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-xs font-black text-white">
                      {itemCount} {itemCount === 1 ? "bag" : "bags"}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-800 font-medium">Empty</span>
                  )}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal("/cart");
                  }}
                  className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-base font-bold transition-all min-h-[48px] bg-amber-50/80 text-amber-950 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-xl" aria-hidden="true">🛒</span>
                    <span>Your Cart</span>
                  </div>
                  <span className="text-xs text-amber-800 font-bold bg-amber-200/70 px-2 py-0.5 rounded-full">
                    Login Required
                  </span>
                </button>
              )}

              {/* Customer Account link */}
              {user && (
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 text-base font-bold transition-all min-h-[48px] ${
                    pathname.startsWith("/account")
                      ? "bg-amber-500 text-zinc-950 shadow-sm"
                      : "text-zinc-800 hover:bg-zinc-100"
                  }`}
                >
                  <span className="text-xl">👤</span>
                  <span>My Account &amp; Orders</span>
                </Link>
              )}
            </nav>

            {/* Drawer Footer with Quick Info & Staff Portal Link */}
            <div className="border-t border-zinc-200 bg-zinc-50 p-4 space-y-3">
              <Link
                href="/portal/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-amber-400 hover:bg-zinc-800 active:scale-95 transition min-h-[44px]"
              >
                <span>🔐</span>
                <span>Staff &amp; Admin Portal</span>
              </Link>
              <div className="text-center text-xs text-zinc-500">
                <p className="font-semibold text-zinc-700">Gollapudi Wholesale Market</p>
                <p>Vijayawada · +91 99999 00000</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
