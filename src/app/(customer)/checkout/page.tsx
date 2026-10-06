"use client";

import { useEffect, useState, useRef } from "react";
import { useCart } from "@/components/CartProvider";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { formatCurrency } from "@/lib/types";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user, loading: authLoading, openAuthModal } = useCustomerAuth();
  const router = useRouter();

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("NEW");

  // Checkout form
  const [form, setForm] = useState({
    customerName: "",
    deliveryAddress: "",
    city: "Vijayawada",
    state: "Andhra Pradesh",
    pincode: "520001",
    customerStateCode: "37",
    placeOfSupply: "37-Andhra Pradesh",
    email: "",
    gstNumber: "",
    transporterName: "",
    saveAddress: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Unique Idempotency Key to protect against double submits
  const idempotencyKeyRef = useRef<string>("");
  useEffect(() => {
    idempotencyKeyRef.current = `radhe-order-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  // Empty Cart check
  useEffect(() => {
    if (items.length === 0 && !submitting) {
      router.replace("/products");
    }
  }, [items.length, router, submitting]);

  // Auth requirement check: Redirect or open modal if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal("/checkout");
    }
  }, [authLoading, user, openAuthModal]);

  // Load customer details and saved addresses on login
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        customerName: prev.customerName || user.name || "",
        email: prev.email || user.email || "",
      }));

      // Fetch saved addresses
      fetch("/api/customer/addresses")
        .then((res) => res.json())
        .then((data) => {
          if (data.addresses && Array.isArray(data.addresses) && data.addresses.length > 0) {
            setSavedAddresses(data.addresses);
            const defaultAddr = data.addresses.find((a: SavedAddress) => a.isDefault) || data.addresses[0];
            if (defaultAddr) {
              setSelectedAddressId(defaultAddr.id);
              setForm((prev) => ({
                ...prev,
                customerName: defaultAddr.name || prev.customerName,
                deliveryAddress: defaultAddr.address,
                city: defaultAddr.city,
                state: defaultAddr.state,
                pincode: defaultAddr.pincode,
              }));
            }
          }
        })
        .catch((err) => console.error("Could not load addresses", err));
    }
  }, [user]);

  function handleSelectSavedAddress(addr: SavedAddress) {
    setSelectedAddressId(addr.id);
    setForm((prev) => ({
      ...prev,
      customerName: addr.name || prev.customerName,
      deliveryAddress: addr.address,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
    }));
  }

  function handleSelectNewAddress() {
    setSelectedAddressId("NEW");
    setForm((prev) => ({
      ...prev,
      deliveryAddress: "",
      city: "Vijayawada",
      state: "Andhra Pradesh",
      pincode: "520001",
    }));
  }

  if (items.length === 0) {
    return null;
  }

  // If customer is unauthenticated, show protected barrier screen
  if (!user && !authLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="overflow-hidden rounded-3xl border border-amber-200 bg-white p-8 shadow-xl space-y-5">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-4xl shadow-inner">
            🔒
          </div>
          <h1 className="text-2xl font-black text-zinc-900">Authentication Required</h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Customers must verify their mobile number with an instant OTP before placing wholesale orders.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => openAuthModal("/checkout")}
              className="w-full rounded-xl bg-amber-600 py-3.5 text-base font-bold text-white shadow-md hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>📱</span>
              <span>Login / Sign Up with Mobile OTP →</span>
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            Your cart will be preserved. You will be redirected right back to checkout.
          </p>
        </div>
      </div>
    );
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <span className="text-3xl animate-spin">⏳</span>
        <p className="text-sm font-semibold text-zinc-500">Checking authentication…</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return; // Prevent double submit

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          shopName: form.customerName,
          deliveryAddress: form.deliveryAddress,
          shopAddress: form.deliveryAddress,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          email: form.email || undefined,
          gstNumber: form.gstNumber ? form.gstNumber.toUpperCase() : undefined,
          deliveryAddressId: selectedAddressId !== "NEW" ? selectedAddressId : undefined,
          saveAddress: form.saveAddress,
          customerStateCode: form.customerStateCode,
          placeOfSupply: form.placeOfSupply,
          transporterName: form.transporterName,
          idempotencyKey: idempotencyKeyRef.current,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.price })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requiresAuth) {
          openAuthModal("/checkout");
          throw new Error("Your session expired. Please log in again.");
        }
        throw new Error(data.error ?? "Checkout failed");
      }

      const orderNumber = String(data.orderNumber);
      sessionStorage.setItem("lastOrderNumber", orderNumber);
      sessionStorage.setItem("invoiceNumber", data.invoiceNumber);
      sessionStorage.setItem("challanNumber", data.challanNumber);
      clearCart();
      router.push(`/order-success?orderNumber=${encodeURIComponent(orderNumber)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong with your order.");
      setSubmitting(false);
    }
  }

  const gstSummary = items.map((item) => ({
    productId: item.productId,
    subtotal: item.price * item.quantity,
    gstRate: item.gstRate ?? 5,
    cgst: (item.price * item.quantity * ((item.gstRate ?? 5) / 2 / 100)),
    sgst: (item.price * item.quantity * ((item.gstRate ?? 5) / 2 / 100)),
  }));
  const totalGst = gstSummary.reduce((sum, line) => sum + line.cgst + line.sgst, 0);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const grandTotal = total + totalGst;
  const totalItemsLabel = `${itemCount} item${itemCount === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-6 space-y-1">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
          <span>🛒 Secure Checkout</span>
          <span>·</span>
          <span>🔒 Authenticated Order</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">Wholesale Order Checkout</h1>
        <p className="text-xs sm:text-sm text-zinc-500">
          Order will be linked to your verified account <strong className="text-zinc-800 font-bold font-mono">{user.phone}</strong>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Billing & Delivery Form */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-xs lg:col-span-2 space-y-6">
          {/* Customer Authenticated Header Badge */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-lg">
                ✓
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-emerald-950">
                    Logged in as {user.name || "Valued Customer"}
                  </span>
                  <span className="rounded-full bg-emerald-200 px-2 py-0.2 text-[10px] font-black text-emerald-900">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-emerald-800 font-mono">Mobile: {user.phone}</p>
              </div>
            </div>
            <Link
              href="/account"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
            >
              Manage Account →
            </Link>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Customer Name & Verified Mobile */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs sm:text-sm font-semibold text-zinc-700">Customer / Shop Name *</span>
                <input
                  required
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar / Sri Krishna Traders"
                  autoComplete="name"
                  className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-zinc-50/50 px-4 py-3 text-base sm:text-sm text-zinc-900 focus:border-amber-500 focus:bg-white focus:outline-none min-h-[44px]"
                />
              </label>

              <label className="block">
                <span className="text-xs sm:text-sm font-semibold text-zinc-700 flex items-center justify-between">
                  <span>Verified Mobile Number *</span>
                  <span className="text-[11px] text-emerald-700 font-bold">✓ OTP Verified</span>
                </span>
                <input
                  readOnly
                  disabled
                  value={user.phone}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-100/80 px-4 py-3 text-base sm:text-sm text-zinc-700 font-mono cursor-not-allowed min-h-[44px]"
                  title="Mobile number is verified via OTP authentication"
                />
              </label>
            </div>

            {/* Email & GST */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs sm:text-sm font-semibold text-zinc-700">Email Address (Optional)</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. billing@example.com"
                  autoComplete="email"
                  className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-zinc-50/50 px-4 py-3 text-base sm:text-sm text-zinc-900 focus:border-amber-500 focus:bg-white focus:outline-none min-h-[44px]"
                />
              </label>

              <label className="block">
                <span className="text-xs sm:text-sm font-semibold text-zinc-700">GST Number (Optional)</span>
                <input
                  value={form.gstNumber}
                  onChange={(e) => setForm({ ...form, gstNumber: e.target.value.toUpperCase() })}
                  placeholder="37AAAAA0000A1Z5"
                  autoCapitalize="characters"
                  className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-zinc-50/50 px-4 py-3 text-base sm:text-sm text-zinc-900 uppercase font-mono focus:border-amber-500 focus:bg-white focus:outline-none min-h-[44px]"
                />
              </label>
            </div>

            {/* Saved Delivery Addresses Selector */}
            {savedAddresses.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs sm:text-sm font-bold text-zinc-800">Choose Delivery Address</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => handleSelectSavedAddress(addr)}
                        className={`cursor-pointer rounded-xl border p-3 text-xs transition ${
                          isSelected
                            ? "border-amber-600 bg-amber-50/70 shadow-xs"
                            : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-zinc-900">
                          <span>{addr.name}</span>
                          {addr.isDefault && (
                            <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-600 mt-1 line-clamp-2">{addr.address}</p>
                        <p className="text-zinc-500 font-semibold mt-0.5">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                      </div>
                    );
                  })}

                  <div
                    onClick={handleSelectNewAddress}
                    className={`cursor-pointer rounded-xl border p-3 text-xs flex items-center justify-center text-center font-bold transition ${
                      selectedAddressId === "NEW"
                        ? "border-amber-600 bg-amber-50/70 text-amber-950 shadow-xs"
                        : "border-dashed border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    + Use Another Address
                  </div>
                </div>
              </div>
            )}

            {/* Address fields */}
            <div className="space-y-4 pt-1">
              <label className="block">
                <span className="text-xs sm:text-sm font-semibold text-zinc-700">Delivery Address *</span>
                <textarea
                  required
                  value={form.deliveryAddress}
                  onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                  placeholder="Shop/Premises No, Street, Landmark"
                  rows={2}
                  autoComplete="street-address"
                  className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-zinc-50/50 px-4 py-3 text-base sm:text-sm text-zinc-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs sm:text-sm font-semibold text-zinc-700">City / Town *</span>
                  <input
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Vijayawada"
                    autoComplete="address-level2"
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-zinc-50/50 px-4 py-2.5 text-base sm:text-sm text-zinc-900 focus:border-amber-500 focus:bg-white focus:outline-none min-h-[44px]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs sm:text-sm font-semibold text-zinc-700">State *</span>
                  <input
                    required
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="Andhra Pradesh"
                    autoComplete="address-level1"
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-zinc-50/50 px-4 py-2.5 text-base sm:text-sm text-zinc-900 focus:border-amber-500 focus:bg-white focus:outline-none min-h-[44px]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs sm:text-sm font-semibold text-zinc-700">PIN Code *</span>
                  <input
                    required
                    maxLength={6}
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })}
                    placeholder="520001"
                    autoComplete="postal-code"
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-zinc-50/50 px-4 py-2.5 text-base sm:text-sm text-zinc-900 font-mono focus:border-amber-500 focus:bg-white focus:outline-none min-h-[44px]"
                  />
                </label>
              </div>

              {selectedAddressId === "NEW" && (
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={form.saveAddress}
                    onChange={(e) => setForm({ ...form, saveAddress: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-semibold text-zinc-700">
                    Save this address to My Account for future wholesale orders
                  </span>
                </label>
              )}
            </div>

            {/* Transport details */}
            <div className="rounded-2xl border border-zinc-200 bg-slate-50 p-4 sm:p-5 space-y-2">
              <label className="block">
                <span className="text-xs font-semibold text-zinc-700">Preferred Transporter Name (Optional)</span>
                <input
                  value={form.transporterName}
                  onChange={(e) => setForm({ ...form, transporterName: e.target.value })}
                  placeholder="e.g. Navata, VRL Logistics, or Local Auto/Lorry"
                  className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-base sm:text-sm text-zinc-900 focus:border-amber-500 focus:outline-none min-h-[44px]"
                />
              </label>
              <p className="text-[11px] text-zinc-500">
                Official delivery challan and transport LR number will be attached upon warehouse packing.
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs sm:text-sm font-semibold text-red-700 flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-amber-600 py-4 text-base font-bold text-white shadow-md hover:bg-amber-700 active:scale-98 disabled:opacity-60 transition-all min-h-[50px] flex items-center justify-center cursor-pointer gap-2"
            >
              {submitting ? (
                <>
                  <span className="animate-spin text-lg">⏳</span>
                  <span>Placing Wholesale Order…</span>
                </>
              ) : (
                <>
                  <span>Place Wholesale Order →</span>
                  <span className="text-amber-200 font-mono">({formatCurrency(grandTotal)})</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order Summary Aside */}
        <aside className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-xs h-fit space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 border-b border-zinc-100 pb-3">
            Order Summary ({totalItemsLabel})
          </h2>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.productId} className="flex items-start justify-between gap-3 text-xs sm:text-sm pb-2 border-b border-zinc-50">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-zinc-900 break-words">{item.name}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {item.quantity} × {formatCurrency(item.price)}
                  </p>
                </div>
                <div className="text-right font-black text-amber-900 shrink-0">
                  {formatCurrency(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-zinc-100 pt-3 text-xs sm:text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Total Wholesale Bags</span>
              <span className="font-semibold text-zinc-900">{totalItemsLabel}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Taxable Base Subtotal</span>
              <span className="font-semibold text-zinc-900">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>GST (approx. 5%)</span>
              <span className="font-semibold text-emerald-700">{formatCurrency(totalGst)}</span>
            </div>
            <div className="flex justify-between items-baseline border-t border-zinc-200 pt-2 text-sm sm:text-base font-black">
              <span className="text-zinc-900">Total Payable</span>
              <span className="text-lg sm:text-xl text-amber-900">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <div className="rounded-xl bg-amber-50/70 p-3 text-[11px] text-amber-900/90 space-y-1">
            <p className="font-bold">🛡️ Protected Transaction</p>
            <p className="text-zinc-500">
              Linked to user ID <code className="font-mono text-zinc-800">{user.id}</code>. Duplicate submissions are automatically rejected.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
