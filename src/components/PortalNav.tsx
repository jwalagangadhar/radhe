"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const adminLinks = [
  { href: "/portal/admin", label: "Dashboard", icon: "📊" },
  { href: "/portal/admin/orders", label: "Orders", icon: "📦" },
  { href: "/portal/admin/customers", label: "Customers", icon: "👥" },
  { href: "/portal/admin/take-order", label: "Take Order ⚡", icon: "⚡" },
  { href: "/portal/admin/cash-counter", label: "Cash Counter 🛒", icon: "🛒" },
  { href: "/portal/admin/inventory", label: "Products", icon: "🏷️" },
  { href: "/portal/admin/arrivals", label: "Arrivals", icon: "🚚" },
  { href: "/portal/admin/stock-requests", label: "Stock Requests", icon: "📋" },
  { href: "/portal/admin/settings", label: "Settings", icon: "⚙️" },
];

const workerLinks = [
  { href: "/portal/worker/queue", label: "Packing Queue", icon: "📦" },
  { href: "/portal/worker/quick-order", label: "Counter Billing 🛒", icon: "🛒" },
  { href: "/portal/worker/stock", label: "Stock Requests", icon: "📋" },
  { href: "/portal/worker/history", label: "History", icon: "🕒" },
];

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  tone: "blue" | "amber" | "red";
  href: string;
};

export function PortalNav({
  role,
  userName,
}: {
  role: "ADMIN" | "WORKER";
  userName: string;
}) {
  const pathname = usePathname();
  const links = role === "ADMIN" ? adminLinks : workerLinks;
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);
  const [remainingWarningSec, setRemainingWarningSec] = useState<number | null>(null);

  // Inactivity timeout: 15 minutes of idle time automatically locks and logs out for safety
  const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;
  const WARNING_THRESHOLD_MS = 60 * 1000;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.href = "/portal/login?reason=logout";
    }
  }

  // Monitor idle time and auto logout on inactivity
  useEffect(() => {
    let lastActivity = Date.now();

    function recordActivity() {
      lastActivity = Date.now();
      setRemainingWarningSec((prev) => (prev !== null ? null : prev));
    }

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    let throttleTimer: NodeJS.Timeout | null = null;
    const handleEvent = () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          recordActivity();
          throttleTimer = null;
        }, 1000);
      }
    };

    activityEvents.forEach((ev) => window.addEventListener(ev, handleEvent, { passive: true }));

    const checkInterval = setInterval(async () => {
      const elapsed = Date.now() - lastActivity;
      if (elapsed >= INACTIVITY_LIMIT_MS) {
        clearInterval(checkInterval);
        try {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        } finally {
          window.location.href = "/portal/login?reason=timeout";
        }
      } else if (elapsed >= INACTIVITY_LIMIT_MS - WARNING_THRESHOLD_MS) {
        const secLeft = Math.max(1, Math.ceil((INACTIVITY_LIMIT_MS - elapsed) / 1000));
        setRemainingWarningSec(secLeft);
      } else {
        setRemainingWarningSec(null);
      }
    }, 1000);

    return () => {
      clearInterval(checkInterval);
      if (throttleTimer) clearTimeout(throttleTimer);
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleEvent));
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [mobileMenuOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (role !== "ADMIN") return;
    async function loadNotifications() {
      try {
        const [ordersRes, messagesRes, alertsRes] = await Promise.all([
          fetch("/api/orders?status=PENDING", { credentials: "include" }),
          fetch("/api/messages", { credentials: "include" }),
          fetch("/api/dashboard/low-stock-alerts", { credentials: "include" }),
        ]);
        const next: NotificationItem[] = [];
        if (ordersRes.ok) {
          const data = await ordersRes.json();
          for (const order of (data.orders ?? []).slice(0, 5)) {
            next.push({ id: `order-${order.id}`, title: "New order received", message: `Order #${order.orderNumber} is waiting for attention`, tone: "blue", href: "/portal/admin/orders" });
          }
        }
        if (messagesRes.ok) {
          const data = await messagesRes.json();
          for (const message of (data.messages ?? []).slice(-5).reverse()) {
            next.push({ id: `message-${message.id}`, title: "New chat message", message: `${message.sender?.name ?? "Team member"}: ${message.body}`, tone: "blue", href: "/portal/admin#worker-chat" });
          }
        }
        if (alertsRes.ok) {
          const data = await alertsRes.json();
          for (const product of (data.criticalStock ?? []).slice(0, 5)) {
            next.push({ id: `critical-${product.id}`, title: "Critical stock alert", message: `${product.name} is below its minimum level`, tone: "red", href: "/portal/admin#stock-alerts" });
          }
          for (const product of (data.lowStock ?? []).filter((item: { id: string }) => !(data.criticalStock ?? []).some((critical: { id: string }) => critical.id === item.id)).slice(0, 5)) {
            next.push({ id: `low-${product.id}`, title: "Low stock alert", message: `${product.name} needs restocking`, tone: "amber", href: "/portal/admin#stock-alerts" });
          }
          if ((data.pendingRequests ?? []).length > 0) {
            next.push({ id: "pending-stock", title: "Pending stock additions", message: `${data.pendingRequests.length} stock request${data.pendingRequests.length === 1 ? "" : "s"} need review`, tone: "amber", href: "/portal/admin/stock-requests" });
          }
        }
        setNotifications(next);
      } catch {
        // Keep the notification panel available even if one source is unavailable.
      }
    }
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [role]);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white shadow-2xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:py-3">
        {/* Brand / User Info */}
        <div className="flex items-center gap-3">
          <Link href={role === "ADMIN" ? "/portal/admin" : "/portal/worker/queue"} className="flex items-center gap-2">
            <span className="text-xl">🌾</span>
            <div>
              <p className="text-sm font-black text-stone-900 leading-tight">Radhe Portal</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-stone-500 font-medium truncate max-w-[120px] sm:max-w-[200px]">
                  {userName}
                </span>
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] font-black uppercase tracking-wider ${
                    role === "ADMIN"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}
                >
                  {role}
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation (>= lg) */}
        <nav className="hidden lg:flex items-center gap-1.5" aria-label="Desktop portal navigation">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  isActive
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-stone-700 hover:bg-amber-50"
                }`}
              >
                {link.label === "Settings" ? (
                  <span className="flex items-center gap-1" title="Settings" aria-label="Settings">
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.4 13a7.7 7.7 0 0 0 0-2l2-1.5-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.4 3.1a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.4 7.4 0 0 0 1.7 1L11 21h4l.4-3.1a7.4 7.4 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5ZM13 15.5A3.5 3.5 0 1 1 13 8a3.5 3.5 0 0 1 0 7.5Z" />
                    </svg>
                    <span>Settings</span>
                  </span>
                ) : (
                  link.label
                )}
              </Link>
            );
          })}

          {/* Admin Notifications Dropdown */}
          {role === "ADMIN" && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-label="Open notifications"
                aria-expanded={notificationsOpen}
                className="relative rounded-lg p-2 text-stone-600 hover:bg-stone-100 cursor-pointer transition"
              >
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22a2.4 2.4 0 0 0 2.3-1.8h-4.6A2.4 2.4 0 0 0 12 22Zm7-5.2-1.5-1.7V10a5.5 5.5 0 0 0-4.5-5.4V3a1 1 0 1 0-2 0v1.6A5.5 5.5 0 0 0 6.5 10v5.1L5 16.8c-.6.7-.1 1.7.8 1.7h12.4c.9 0 1.4-1 .8-1.7Z" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute 0 top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-[320px] max-w-[calc(100vw-1rem)] border border-stone-300 bg-white shadow-xl rounded-xl overflow-hidden">
                  <div className="flex h-10 items-center justify-between border-b border-stone-200 bg-stone-50 px-3">
                    <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Notifications</h2>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNotifications([])}
                        aria-label="Mark all as read"
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotificationsOpen(false)}
                        aria-label="Close notifications"
                        className="text-stone-400 hover:text-stone-600 font-bold p-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="min-h-[80px] max-h-[280px] overflow-y-auto p-1 divide-y divide-stone-100">
                    {notifications.length === 0 ? (
                      <p className="py-6 text-center text-xs text-stone-500">No active alerts</p>
                    ) : (
                      notifications.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setNotificationsOpen(false)}
                          className="block rounded-lg p-2.5 hover:bg-stone-50 transition"
                        >
                          <p className={`text-xs font-bold ${
                            item.tone === "red" ? "text-red-700" : item.tone === "amber" ? "text-amber-700" : "text-blue-700"
                          }`}>
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-stone-600">{item.message}</p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="ml-2 rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer transition"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </nav>

        {/* Mobile Action Controls (< lg) */}
        <div className="flex lg:hidden items-center gap-2">
          {/* Notifications Icon on Mobile */}
          {role === "ADMIN" && (
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setMobileMenuOpen(false);
              }}
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-700 active:scale-95 transition"
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22a2.4 2.4 0 0 0 2.3-1.8h-4.6A2.4 2.4 0 0 0 12 22Zm7-5.2-1.5-1.7V10a5.5 5.5 0 0 0-4.5-5.4V3a1 1 0 1 0-2 0v1.6A5.5 5.5 0 0 0 6.5 10v5.1L5 16.8c-.6.7-.1 1.7.8 1.7h12.4c.9 0 1.4-1 .8-1.7Z" />
              </svg>
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>
          )}

          {/* Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen((prev) => !prev);
              setNotificationsOpen(false);
            }}
            aria-expanded={mobileMenuOpen}
            aria-controls="portal-mobile-drawer"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-800 active:scale-95 transition"
          >
            {mobileMenuOpen ? (
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Notifications Popover Drawer */}
      {notificationsOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-white p-3 shadow-lg max-h-[300px] overflow-y-auto divide-y divide-stone-100">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-xs font-bold text-stone-900 uppercase">Alerts ({notifications.length})</h2>
            <button
              type="button"
              onClick={() => setNotifications([])}
              className="text-xs font-semibold text-blue-600"
            >
              Mark all read
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="py-4 text-center text-xs text-stone-500">No active alerts</p>
          ) : (
            notifications.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setNotificationsOpen(false)}
                className="block py-2"
              >
                <p className={`text-xs font-bold ${
                  item.tone === "red" ? "text-red-700" : item.tone === "amber" ? "text-amber-700" : "text-blue-700"
                }`}>
                  {item.title}
                </p>
                <p className="text-[11px] text-stone-600 mt-0.5">{item.message}</p>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          id="portal-mobile-drawer"
          className="fixed inset-0 z-50 lg:hidden flex justify-end animate-in fade-in duration-200"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative z-10 flex h-full w-[85vw] max-w-sm flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 p-4 bg-stone-50">
              <div>
                <p className="text-sm font-black text-stone-900">Radhe Operations Portal</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Signed in as <strong>{userName}</strong> ({role})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-stone-200 text-stone-600 active:scale-95"
                aria-label="Close navigation"
              >
                ✕
              </button>
            </div>

            {/* Links List */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1.5" aria-label="Mobile portal menu">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all min-h-[48px] ${
                      isActive
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-stone-800 hover:bg-stone-100 active:bg-stone-200"
                    }`}
                  >
                    <span className="text-lg" aria-hidden="true">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Footer with Storefront Link and Logout */}
            <div className="border-t border-stone-200 bg-stone-50 p-4 space-y-3">
              <Link
                href="/"
                className="flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-100 active:scale-95 transition min-h-[44px]"
              >
                <span>←</span>
                <span>Customer Storefront</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-xs font-black text-white hover:bg-red-700 active:scale-95 transition disabled:opacity-60 min-h-[44px] cursor-pointer"
              >
                <span>🚪</span>
                <span>{loggingOut ? "Signing out…" : "Log Out of Portal"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inactivity Security Warning Modal */}
      {remainingWarningSec !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-amber-300 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 text-2xl shadow-inner">
              ⏱️
            </div>
            <div>
              <h3 className="text-base font-extrabold text-zinc-900">Inactivity Security Warning</h3>
              <p className="mt-1 text-xs text-zinc-600">
                To protect enterprise billing &amp; store operations, your session will automatically lock in:
              </p>
              <p className="mt-2 text-3xl font-black text-amber-600 font-mono tracking-tight">
                {remainingWarningSec}s
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRemainingWarningSec(null);
                }}
                className="flex-1 rounded-xl bg-amber-600 py-2.5 px-3 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition active:scale-95 cursor-pointer"
              >
                Stay Logged In
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-zinc-300 py-2.5 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition active:scale-95 cursor-pointer"
              >
                Log Out Now
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
