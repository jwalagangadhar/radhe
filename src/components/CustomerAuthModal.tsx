"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)", flag: "🇮🇳", placeholder: "98765 43210" },
  { code: "+1", label: "United States (+1)", flag: "🇺🇸", placeholder: "202 555 0123" },
  { code: "+44", label: "United Kingdom (+44)", flag: "🇬🇧", placeholder: "7911 123456" },
  { code: "+971", label: "UAE (+971)", flag: "🇦🇪", placeholder: "50 123 4567" },
  { code: "+65", label: "Singapore (+65)", flag: "🇸🇬", placeholder: "8123 4567" },
  { code: "+61", label: "Australia (+61)", flag: "🇦🇺", placeholder: "412 345 678" },
  { code: "+966", label: "Saudi Arabia (+966)", flag: "🇸🇦", placeholder: "50 123 4567" },
];

export function CustomerAuthModal() {
  const { isAuthModalOpen, closeAuthModal, refreshUser, authReturnUrl } = useCustomerAuth();
  const router = useRouter();

  // Step 1: "PHONE", Step 2: "OTP"
  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");

  // 6 individual OTP digit inputs
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Countdown timer for OTP resend
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Timer interval
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isAuthModalOpen) {
      setStep("PHONE");
      setPhoneNumber("");
      setOtpDigits(["", "", "", "", "", ""]);
      setError("");
      setSuccessMsg("");
      setCountdown(0);
      setDevOtp(null);
    }
  }, [isAuthModalOpen]);

  // Auto focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === "OTP") {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  if (!isAuthModalOpen) return null;

  // Validate phone format before requesting OTP
  function validatePhoneClientSide(): boolean {
    const clean = phoneNumber.replace(/\D/g, "");
    if (!clean) {
      setError("Please enter your mobile phone number.");
      return false;
    }
    if (countryCode === "+91") {
      if (clean.length !== 10 || !/^[6-9]/.test(clean)) {
        setError("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
        return false;
      }
    } else {
      if (clean.length < 6 || clean.length > 14) {
        setError("Please enter a valid phone number for the selected country.");
        return false;
      }
    }
    return true;
  }

  // Handle Send OTP
  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!validatePhoneClientSide()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/customer/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneNumber.replace(/\D/g, ""),
          countryCode,
          purpose: "LOGIN",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP. Please check the number.");
      }

      setStep("OTP");
      setCountdown(data.cooldownSeconds || 60);
      setSuccessMsg(data.isSimulated ? "Demo OTP generated for development testing." : "Verification code dispatched to your phone.");
      setOtpDigits(["", "", "", "", "", ""]);
      setDevOtp(data.simulatedOtp || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  // Handle OTP digit typing
  function handleDigitChange(index: number, value: string) {
    // Only accept single digit
    const cleaned = value.replace(/\D/g, "");
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      // Handle paste of multiple characters
      const pasted = cleaned.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || "";
      }
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    // Auto-advance to next input if digit entered
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || "";
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  }

  // Handle Verify OTP
  async function handleVerifyOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError("");

    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/customer/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneNumber.replace(/\D/g, ""),
          countryCode,
          otp: fullOtp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Verification failed. Incorrect OTP.");
      }

      await refreshUser();
      closeAuthModal();

      if (authReturnUrl) {
        router.push(authReturnUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  // Display masked phone: e.g. +91 98*** **210
  const cleanNum = phoneNumber.replace(/\D/g, "");
  const maskedPhone =
    cleanNum.length >= 10
      ? `${countryCode} ${cleanNum.slice(0, 2)}*** ***${cleanNum.slice(-2)}`
      : `${countryCode} ${cleanNum}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* Background click to close */}
      <div className="fixed inset-0" onClick={closeAuthModal} aria-hidden="true" />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-amber-100">
        {/* Top Decorative Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 px-6 py-6 text-white text-center relative">
          <button
            type="button"
            onClick={closeAuthModal}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
            aria-label="Close dialog"
          >
            ✕
          </button>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md shadow-inner text-2xl mb-2">
            📱
          </div>
          <h2 id="auth-modal-title" className="text-xl sm:text-2xl font-black tracking-tight">
            {step === "PHONE" ? "Login or Create Account" : "Verify Mobile Number"}
          </h2>
          <p className="text-xs sm:text-sm text-amber-100/90 mt-1 max-w-xs mx-auto">
            {step === "PHONE"
              ? "Fast, passwordless login with your mobile phone number and OTP"
              : `Enter the 6-digit OTP sent to ${maskedPhone}`}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs sm:text-sm text-red-700 font-semibold flex items-start gap-2.5 animate-in fade-in">
              <span className="text-base shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && !error && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs sm:text-sm text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
              <span>✅</span>
              <span>{successMsg}</span>
            </div>
          )}

          {step === "PHONE" ? (
            /* Step 1: Phone input */
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Country Code &amp; Mobile Number
                </label>
                <div className="flex rounded-xl border border-zinc-300 bg-zinc-50/60 focus-within:border-amber-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-500/20 transition-all overflow-hidden">
                  {/* Country Selector */}
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-transparent px-3 py-3 text-sm font-bold text-zinc-800 border-r border-zinc-200 focus:outline-none cursor-pointer"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>

                  {/* Phone input */}
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    autoFocus
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder={COUNTRY_CODES.find((c) => c.code === countryCode)?.placeholder || "10-digit number"}
                    className="flex-1 px-4 py-3 text-base sm:text-sm font-semibold text-zinc-900 bg-transparent focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5 flex items-center gap-1">
                  <span>🔒</span>
                  <span>We will send a 6-digit one-time code to verify this phone number.</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-amber-600 py-3.5 text-sm sm:text-base font-bold text-white shadow-md hover:bg-amber-700 active:scale-98 disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                {loading ? (
                  <>
                    <span className="animate-spin text-lg">⏳</span>
                    <span>Sending OTP…</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Step 2: 6-Digit OTP Verification */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600">Sent to: <strong className="text-zinc-900 font-bold">{maskedPhone}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setStep("PHONE");
                    setError("");
                  }}
                  className="text-amber-700 font-bold hover:underline"
                >
                  Edit Number
                </button>
              </div>

              {devOtp && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-950 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between font-bold">
                    <span>⚡ Development / Demo Mode</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full uppercase">SMS Simulated</span>
                  </div>
                  <p className="text-zinc-600 text-[11px]">
                    No SMS gateway key is set in <code className="bg-amber-100 font-mono px-1 rounded">.env</code>. Your test verification code is:
                  </p>
                  <div className="flex items-center justify-between bg-white border border-amber-300 rounded-lg px-3 py-2 shadow-xs">
                    <span className="text-lg font-black tracking-widest text-amber-950">{devOtp}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const digits = devOtp.split("").slice(0, 6);
                        setOtpDigits(digits);
                        inputRefs.current[5]?.focus();
                      }}
                      className="text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Auto-Fill Code
                    </button>
                  </div>
                </div>
              )}

              {/* 6 Digit Input Group */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2 text-center">
                  Enter 6-Digit OTP
                </label>
                <div className="flex justify-between gap-2 sm:gap-2.5" onPaste={handlePaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="h-12 w-11 sm:h-14 sm:w-12 text-center text-xl sm:text-2xl font-black text-amber-950 bg-amber-50/50 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner"
                      aria-label={`Digit ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpDigits.join("").length !== 6}
                className="w-full rounded-xl bg-amber-600 py-3.5 text-sm sm:text-base font-bold text-white shadow-md hover:bg-amber-700 active:scale-98 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                {loading ? (
                  <>
                    <span className="animate-spin text-lg">⏳</span>
                    <span>Verifying OTP…</span>
                  </>
                ) : (
                  <>
                    <span>Verify &amp; Continue</span>
                    <span>✓</span>
                  </>
                )}
              </button>

              {/* Resend OTP Row */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs text-zinc-500">
                <span>Didn&apos;t receive code?</span>
                {countdown > 0 ? (
                  <span className="font-semibold text-zinc-500">
                    Resend in <strong className="text-amber-700 font-bold">{countdown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    className="font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Trust badge */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
              <span>🛡️</span>
              <span>256-Bit Encrypted · Instant SMS Delivery · Zero Passwords</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
