"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface ActiveSessionUser {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "WORKER";
}

function PortalLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeUser, setActiveUser] = useState<ActiveSessionUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if an existing session is present, but DO NOT automatically force redirect away.
  // This allows presenters and users to see the login screen, switch accounts, or demo properly.
  useEffect(() => {
    async function checkCurrentSession() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setActiveUser(data.user);
          } else {
            setActiveUser(null);
          }
        } else {
          setActiveUser(null);
        }
      } catch {
        setActiveUser(null);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkCurrentSession();
  }, []);

  async function handleLogoutActive() {
    setLoggingOut(true);
    setError("");
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setActiveUser(null);
      router.replace("/portal/login?reason=logout");
    } catch {
      setError("Unable to log out current session.");
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid email/username or password.");
        return;
      }

      const targetPath = data.user.role === "ADMIN" ? "/portal/admin" : "/portal/worker";
      router.push(targetPath);
      router.refresh();
    } catch (err) {
      setError("Unable to connect to server. Please try again.");
      console.error("Login failure:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-zinc-100 to-amber-50/40 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex justify-center items-center mb-3">
            <Image
              src="/logo.png"
              alt="Rajyalakshmi Radhe"
              width={140}
              height={80}
              className="h-14 w-auto object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">
            Rajyalakshmi Radhe Portal
          </h1>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700">
            Enterprise Operations &amp; Staff Access
          </p>
        </div>

        {/* Security & Status Banners */}
        {reason === "timeout" && (
          <div
            role="status"
            className="mb-4 rounded-2xl bg-amber-50 border border-amber-300 p-4 text-xs text-amber-900 shadow-sm flex items-start gap-3"
          >
            <span className="text-xl leading-none" aria-hidden="true">⏱️</span>
            <div className="space-y-0.5">
              <p className="font-bold text-amber-950">Logged Out Due to Inactivity</p>
              <p className="text-amber-800 leading-relaxed">
                For security, your session was automatically locked after a period of inactivity to protect billing and store operations. Please sign in again.
              </p>
            </div>
          </div>
        )}

        {reason === "logout" && (
          <div
            role="status"
            className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-300 p-3.5 text-xs text-emerald-900 shadow-sm flex items-center gap-2.5"
          >
            <span className="text-base text-emerald-600 font-bold" aria-hidden="true">✓</span>
            <p className="font-medium">You have safely logged out of your portal session.</p>
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-zinc-200/80 bg-white p-5 sm:p-8 shadow-lg shadow-zinc-200/50 backdrop-blur-sm">
          {/* Active Session Notice (if already logged in, show options without forcing redirect) */}
          {!checkingAuth && activeUser && (
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white font-bold text-sm shadow-xs">
                    {activeUser.role === "ADMIN" ? "⚡" : "📦"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900 truncate max-w-[150px]">
                        {activeUser.name || activeUser.username}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          activeUser.role === "ADMIN"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-blue-100 text-blue-900 border border-blue-300"
                        }`}
                      >
                        {activeUser.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500">Active login detected</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogoutActive}
                  disabled={loggingOut}
                  className="rounded-lg px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 transition border border-red-200"
                >
                  {loggingOut ? "Signing out..." : "Log Out"}
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-amber-200/60">
                <Link
                  href={activeUser.role === "ADMIN" ? "/portal/admin" : "/portal/worker"}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 shadow-sm transition active:scale-[0.99]"
                >
                  <span>Continue to {activeUser.role === "ADMIN" ? "Admin Command Center" : "Worker Operations"}</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-lg font-bold text-zinc-900">
              {activeUser ? "Sign In with Another Account" : "Sign in to your account"}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Enter credentials to access Admin Command Center or Worker Operations.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="identifier-input"
                className="block text-xs font-bold uppercase tracking-wider text-zinc-700"
              >
                Email or Username
              </label>
              <div className="mt-1.5 relative">
                <input
                  id="identifier-input"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="admin or worker"
                  className="w-full min-h-[44px] rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 sm:py-3 text-base sm:text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  type="text"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password-input"
                className="block text-xs font-bold uppercase tracking-wider text-zinc-700"
              >
                Password
              </label>
              <div className="mt-1.5 relative">
                <input
                  id="password-input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••••"
                  className="w-full min-h-[44px] rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 sm:py-3 pr-11 text-base sm:text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-2 rounded-md transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-700"
              >
                <svg
                  className="h-4 w-4 shrink-0 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-amber-600/20 transition hover:bg-amber-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    ></path>
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-zinc-100 pt-4 flex items-center justify-between text-[11px] text-zinc-500">
            <Link
              href="/"
              className="font-semibold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
            >
              <span>←</span>
              <span>Back to Customer Store</span>
            </Link>
            <span className="text-zinc-400">Enterprise RBAC</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-100 flex items-center justify-center">
          <div className="flex items-center gap-3 text-stone-600 font-medium">
            <svg
              className="animate-spin h-5 w-5 text-amber-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
            <span>Loading portal login...</span>
          </div>
        </div>
      }
    >
      <PortalLoginContent />
    </Suspense>
  );
}
