"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { formatCurrency } from "@/lib/types";

interface Address {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: {
    name: string;
    unit: string;
    image: string | null;
  };
}

interface Order {
  id: string;
  orderNumber: number;
  total: number;
  status: string;
  createdAt: string;
  deliveryAddress: string | null;
  items: OrderItem[];
  invoice?: {
    invoiceNumber: string;
    paymentStatus: string;
    grandTotal: number;
  } | null;
  deliveryChallan?: {
    challanNumber: string;
    status: string;
    transporterName: string;
  } | null;
}

export default function CustomerAccountPage() {
  const { user, loading, logout, refreshUser } = useCustomerAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"profile" | "addresses" | "orders">("orders");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Profile Edit Modal State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Change Mobile Number Workflow Modal State
  const [phoneChangeModalOpen, setPhoneChangeModalOpen] = useState(false);
  const [phoneChangeStep, setPhoneChangeStep] = useState<"INPUT" | "OTP">("INPUT");
  const [newCountryCode, setNewCountryCode] = useState("+91");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [phoneOtpDigits, setPhoneOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const phoneOtpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [phoneChangeLoading, setPhoneChangeLoading] = useState(false);
  const [phoneChangeError, setPhoneChangeError] = useState("");
  const [phoneChangeSuccess, setPhoneChangeSuccess] = useState("");
  const [phoneCountdown, setPhoneCountdown] = useState(0);
  const [devPhoneChangeOtp, setDevPhoneChangeOtp] = useState<string | null>(null);

  // Address Modal State
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "Vijayawada",
    state: "Andhra Pradesh",
    pincode: "520001",
    isDefault: false,
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState("");

  // Countdown timer for phone change OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phoneCountdown > 0) {
      timer = setInterval(() => {
        setPhoneCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phoneCountdown]);

  // Auth Protection Check
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?returnUrl=/account");
    }
  }, [loading, user, router]);

  // Fetch customer profile, addresses, and orders
  const loadAccountData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [addrRes, ordersRes] = await Promise.all([
        fetch("/api/customer/addresses"),
        fetch("/api/customer/orders"),
      ]);

      if (addrRes.ok) {
        const addrData = await addrRes.json();
        setAddresses(addrData.addresses || []);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      }
    } catch (err) {
      console.error("Failed to load customer account data", err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAccountData();
    }
  }, [user, loadAccountData]);

  if (loading || (!user && loading)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <span className="text-3xl animate-spin">⏳</span>
        <p className="text-sm font-semibold text-zinc-500">Loading your account…</p>
      </div>
    );
  }

  if (!user) return null;

  // Profile Edit Handler
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile.");
      await refreshUser();
      setProfileModalOpen(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  // Phone Change: Send OTP
  async function handleSendPhoneChangeOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setPhoneChangeError("");
    setPhoneChangeSuccess("");

    const clean = newPhoneNumber.replace(/\D/g, "");
    if (!clean || (newCountryCode === "+91" && clean.length !== 10)) {
      setPhoneChangeError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setPhoneChangeLoading(true);
    try {
      const res = await fetch("/api/customer/profile/change-phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPhone: clean,
          countryCode: newCountryCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send verification code.");

      setPhoneChangeStep("OTP");
      setPhoneCountdown(data.cooldownSeconds || 60);
      setPhoneChangeSuccess(data.isSimulated ? "Demo OTP generated for development testing." : "Verification code sent to your new mobile number.");
      setDevPhoneChangeOtp(data.simulatedOtp || null);
      setTimeout(() => phoneOtpInputRefs.current[0]?.focus(), 150);
    } catch (err) {
      setPhoneChangeError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setPhoneChangeLoading(false);
    }
  }

  // Phone Change: Verify OTP & Update Phone
  async function handleVerifyPhoneChangeOtp(e: React.FormEvent) {
    e.preventDefault();
    setPhoneChangeError("");
    const code = phoneOtpDigits.join("");
    if (code.length !== 6) {
      setPhoneChangeError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setPhoneChangeLoading(true);
    try {
      const res = await fetch("/api/customer/profile/change-phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPhone: newPhoneNumber.replace(/\D/g, ""),
          countryCode: newCountryCode,
          otp: code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed. Invalid code.");

      await refreshUser();
      setPhoneChangeModalOpen(false);
      setPhoneChangeStep("INPUT");
      setNewPhoneNumber("");
      setPhoneOtpDigits(["", "", "", "", "", ""]);
      alert("Mobile number verified and updated successfully!");
    } catch (err) {
      setPhoneChangeError(err instanceof Error ? err.message : "Failed to verify phone.");
    } finally {
      setPhoneChangeLoading(false);
    }
  }

  // Address Save Handler (Create or Update)
  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    setAddressSaving(true);
    setAddressError("");
    try {
      const url = editingAddressId
        ? `/api/customer/addresses/${editingAddressId}`
        : "/api/customer/addresses";
      const method = editingAddressId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save address.");

      await loadAccountData();
      setAddressModalOpen(false);
      setEditingAddressId(null);
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Failed to save address.");
    } finally {
      setAddressSaving(false);
    }
  }

  // Address Delete Handler
  async function handleDeleteAddress(id: string) {
    if (!confirm("Are you sure you want to remove this delivery address?")) return;
    try {
      const res = await fetch(`/api/customer/addresses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete address", err);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Account Overview Header */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-600/10 p-6 sm:p-8 backdrop-blur-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-amber-600 text-3xl sm:text-4xl text-white shadow-md">
              👤
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-zinc-900">
                  {user.name || "Customer Account"}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <span>✓</span>
                  <span>Verified Account</span>
                </span>
              </div>
              <p className="text-sm font-semibold text-zinc-600 flex items-center gap-2">
                <span>📱 {user.phone}</span>
                {user.email && <span>· ✉️ {user.email}</span>}
              </p>
              <p className="text-xs text-zinc-400">
                Customer ID: <code className="font-mono">{user.id}</code>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditName(user.name || "");
                setEditEmail(user.email || "");
                setProfileError("");
                setProfileModalOpen(true);
              }}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-zinc-700 shadow-xs hover:bg-zinc-50 active:scale-95 transition"
            >
              ✏️ Edit Profile
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-xs sm:text-sm font-bold text-red-700 shadow-xs hover:bg-red-100 active:scale-95 transition"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 flex border-b border-zinc-200 gap-2 sm:gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`pb-3 text-sm sm:text-base font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === "orders"
              ? "border-amber-600 text-amber-900"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          📦 Order History ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("addresses")}
          className={`pb-3 text-sm sm:text-base font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === "addresses"
              ? "border-amber-600 text-amber-900"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          📍 Saved Addresses ({addresses.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`pb-3 text-sm sm:text-base font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === "profile"
              ? "border-amber-600 text-amber-900"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          🛡️ Profile &amp; Mobile Verification
        </button>
      </div>

      {/* TAB 1: ORDER HISTORY */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {dataLoading ? (
            <div className="p-8 text-center text-sm text-zinc-500">Loading orders…</div>
          ) : orders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 p-12 text-center bg-white space-y-3">
              <span className="text-4xl">🛍️</span>
              <h2 className="text-lg font-bold text-zinc-800">No orders placed yet</h2>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-sm mx-auto">
                Your wholesale orders will appear here once you place them from the catalog.
              </p>
              <Link
                href="/products"
                className="inline-block mt-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-amber-700 transition"
              >
                Browse Wholesale Products →
              </Link>
            </div>
          ) : (
            orders.map((order) => {
              const statusColors: Record<string, string> = {
                PENDING: "bg-amber-50 text-amber-800 border-amber-200",
                APPROVED: "bg-blue-50 text-blue-800 border-blue-200",
                PACKING: "bg-indigo-50 text-indigo-800 border-indigo-200",
                IN_TRANSIT: "bg-purple-50 text-purple-800 border-purple-200",
                DELIVERED: "bg-emerald-50 text-emerald-800 border-emerald-200",
                COMPLETED: "bg-emerald-50 text-emerald-800 border-emerald-200",
                CANCELLED: "bg-red-50 text-red-800 border-red-200",
              };
              const colorClass = statusColors[order.status] || "bg-zinc-100 text-zinc-800 border-zinc-200";

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-xs space-y-4 hover:shadow-sm transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-black text-zinc-900">
                          Order #{order.orderNumber}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wider border ${colorClass}`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg sm:text-xl font-black text-amber-900">
                        {formatCurrency(order.total)}
                      </p>
                      <p className="text-[11px] font-semibold text-zinc-500">
                        Payment: {order.invoice?.paymentStatus || "UNPAID"}
                      </p>
                    </div>
                  </div>

                  {/* Delivery summary */}
                  {order.deliveryAddress && (
                    <div className="text-xs text-zinc-600 bg-zinc-50 rounded-xl p-3 flex items-start gap-2">
                      <span className="shrink-0 text-base">📍</span>
                      <div>
                        <strong className="font-semibold text-zinc-800">Delivery Address:</strong>{" "}
                        {order.deliveryAddress}
                      </div>
                    </div>
                  )}

                  {/* Items list */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Ordered Bags ({order.items.length})
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl border border-zinc-100 p-2.5 text-xs bg-white"
                        >
                          <span className="font-semibold text-zinc-800 truncate mr-2">
                            {item.product.name}
                          </span>
                          <span className="text-zinc-500 shrink-0 font-mono">
                            {item.quantity} {item.product.unit} × ₹{item.unitPrice}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Actions / Tracking link */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100 text-xs">
                    <div className="text-zinc-500">
                      {order.invoice && (
                        <span>Tax Invoice: <strong className="font-mono text-zinc-700">{order.invoice.invoiceNumber}</strong></span>
                      )}
                      {order.deliveryChallan && (
                        <span className="ml-3">Challan: <strong className="font-mono text-zinc-700">{order.deliveryChallan.challanNumber}</strong></span>
                      )}
                    </div>
                    <Link
                      href={`/track?orderNumber=${order.orderNumber}`}
                      className="font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
                    >
                      <span>Track Status Live</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: SAVED ADDRESSES */}
      {activeTab === "addresses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900">Your Delivery Addresses</h2>
            <button
              type="button"
              onClick={() => {
                setEditingAddressId(null);
                setAddressForm({
                  name: user.name || "",
                  phone: user.phone || "",
                  address: "",
                  city: "Vijayawada",
                  state: "Andhra Pradesh",
                  pincode: "520001",
                  isDefault: addresses.length === 0,
                });
                setAddressError("");
                setAddressModalOpen(true);
              }}
              className="rounded-xl bg-amber-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-amber-700 transition"
            >
              + Add New Address
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 p-8 text-center bg-white">
              <p className="text-sm text-zinc-500">No saved addresses yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs relative flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-zinc-900 text-sm sm:text-base">
                        {addr.name}
                      </span>
                      {addr.isDefault && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">{addr.address}</p>
                    <p className="text-xs font-semibold text-zinc-700">
                      {addr.city}, {addr.state} - {addr.pincode}
                    </p>
                    <p className="text-xs text-zinc-500">Phone: {addr.phone}</p>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-zinc-100 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddressId(addr.id);
                        setAddressForm({
                          name: addr.name,
                          phone: addr.phone,
                          address: addr.address,
                          city: addr.city,
                          state: addr.state,
                          pincode: addr.pincode,
                          isDefault: addr.isDefault,
                        });
                        setAddressError("");
                        setAddressModalOpen(true);
                      }}
                      className="font-bold text-amber-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="font-bold text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROFILE & VERIFIED MOBILE WORKFLOW */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <h2 className="text-lg font-bold text-zinc-900 border-b border-zinc-100 pb-3">
              Account Security &amp; Credentials
            </h2>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Verified Mobile Card */}
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Verified Mobile Number
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800">
                    ✓ Verified
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-black text-zinc-900">{user.phone}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Used for passwordless OTP authentication and critical delivery updates.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneChangeStep("INPUT");
                      setNewPhoneNumber("");
                      setPhoneOtpDigits(["", "", "", "", "", ""]);
                      setPhoneChangeError("");
                      setPhoneChangeSuccess("");
                      setPhoneChangeModalOpen(true);
                    }}
                    className="rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-50 transition"
                  >
                    🔄 Change Verified Mobile Number
                  </button>
                </div>
              </div>

              {/* Personal Info Card */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Profile Details
                </span>
                <div>
                  <label className="text-xs text-zinc-400">Full Name</label>
                  <p className="text-base font-bold text-zinc-900">{user.name || "—"}</p>
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Email Address</label>
                  <p className="text-base font-semibold text-zinc-800">{user.email || "No email provided"}</p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(user.name || "");
                      setEditEmail(user.email || "");
                      setProfileError("");
                      setProfileModalOpen(true);
                    }}
                    className="rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-xs hover:bg-zinc-100 transition"
                  >
                    ✏️ Edit Name &amp; Email
                  </button>
                </div>
              </div>
            </div>

            {/* Security Explanation Note */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Why can&apos;t the mobile number be changed without OTP?</span>
              </p>
              <p className="text-amber-900/80 leading-relaxed">
                To protect your wholesale orders and delivery tracking from unauthorized hijacking, mobile number modifications require an independent two-step SMS verification to the new phone.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT PROFILE MODAL */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-bold text-zinc-900">Edit Profile</h3>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            {profileError && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                {profileError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Customer Name *</label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50"
                >
                  {profileSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SEPARATE MOBILE NUMBER VERIFICATION MODAL */}
      {phoneChangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-amber-200 overflow-hidden">
            <div className="bg-amber-600 px-6 py-5 text-white text-center relative">
              <button
                type="button"
                onClick={() => setPhoneChangeModalOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white"
              >
                ✕
              </button>
              <h3 className="text-xl font-black">Change Mobile Number</h3>
              <p className="text-xs text-amber-100 mt-1">
                {phoneChangeStep === "INPUT"
                  ? "Enter the new mobile number you want to verify"
                  : `Enter the 6-digit code sent to ${newCountryCode} ${newPhoneNumber}`}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {phoneChangeError && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {phoneChangeError}
                </div>
              )}
              {phoneChangeSuccess && !phoneChangeError && (
                <div className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                  {phoneChangeSuccess}
                </div>
              )}

              {phoneChangeStep === "INPUT" ? (
                <form onSubmit={handleSendPhoneChangeOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                      New Mobile Phone Number *
                    </label>
                    <div className="flex rounded-xl border border-zinc-300 bg-zinc-50/60 overflow-hidden focus-within:border-amber-600 focus-within:bg-white">
                      <select
                        value={newCountryCode}
                        onChange={(e) => setNewCountryCode(e.target.value)}
                        className="bg-transparent px-3 py-2.5 text-sm font-bold text-zinc-800 border-r border-zinc-200 focus:outline-none"
                      >
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+971">🇦🇪 +971</option>
                      </select>
                      <input
                        type="tel"
                        required
                        value={newPhoneNumber}
                        onChange={(e) => setNewPhoneNumber(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-zinc-900 bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={phoneChangeLoading}
                    className="w-full rounded-xl bg-amber-600 py-3 text-sm font-bold text-white shadow-md hover:bg-amber-700 disabled:opacity-60 transition"
                  >
                    {phoneChangeLoading ? "Sending Code…" : "Send Verification OTP →"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneChangeOtp} className="space-y-4">
                  {devPhoneChangeOtp && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-950 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between font-bold">
                        <span>⚡ Demo Mode</span>
                        <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-1.5 py-0.5 rounded uppercase">Simulated</span>
                      </div>
                      <p className="text-zinc-600 text-[11px]">Your test OTP code is:</p>
                      <div className="flex items-center justify-between bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 shadow-xs">
                        <span className="font-mono text-base font-bold text-amber-950">{devPhoneChangeOtp}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const digits = devPhoneChangeOtp.split("").slice(0, 6);
                            setPhoneOtpDigits(digits);
                            phoneOtpInputRefs.current[5]?.focus();
                          }}
                          className="text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          Auto-Fill
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-2 text-center uppercase tracking-wider">
                      Enter 6-Digit Verification Code
                    </label>
                    <div className="flex justify-between gap-2">
                      {phoneOtpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            phoneOtpInputRefs.current[idx] = el;
                          }}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            const newD = [...phoneOtpDigits];
                            newD[idx] = val;
                            setPhoneOtpDigits(newD);
                            if (val && idx < 5) phoneOtpInputRefs.current[idx + 1]?.focus();
                          }}
                          className="h-12 w-11 text-center text-xl font-bold bg-amber-50/50 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={phoneChangeLoading || phoneOtpDigits.join("").length !== 6}
                    className="w-full rounded-xl bg-amber-600 py-3 text-sm font-bold text-white shadow-md hover:bg-amber-700 disabled:opacity-50 transition"
                  >
                    {phoneChangeLoading ? "Verifying…" : "Confirm & Update Mobile ✓"}
                  </button>

                  <div className="flex justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setPhoneChangeStep("INPUT")}
                      className="text-amber-700 font-bold hover:underline"
                    >
                      ← Change Number
                    </button>
                    {phoneCountdown > 0 ? (
                      <span>Resend in {phoneCountdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendPhoneChangeOtp()}
                        className="text-amber-700 font-bold hover:underline"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADDRESS ADD / EDIT MODAL */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-bold text-zinc-900">
                {editingAddressId ? "Edit Delivery Address" : "Add Delivery Address"}
              </h3>
              <button
                type="button"
                onClick={() => setAddressModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            {addressError && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                {addressError}
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Contact Name *</label>
                  <input
                    required
                    value={addressForm.name}
                    onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                    className="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Contact Phone *</label>
                  <input
                    required
                    type="tel"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Address *</label>
                <textarea
                  required
                  rows={3}
                  value={addressForm.address}
                  onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                  placeholder="Shop No, Street, Landmark"
                  className="w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">City *</label>
                  <input
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">State *</label>
                  <input
                    required
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Pincode *</label>
                  <input
                    required
                    maxLength={6}
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-zinc-700">Set as default delivery address</span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  className="rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addressSaving}
                  className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50"
                >
                  {addressSaving ? "Saving…" : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
