"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/types";
import { useSearchParams } from "next/navigation";

interface TrackedOrder {
  orderNumber: number;
  status: "PENDING" | "DRAFT" | "APPROVED" | "PACKING" | "COMPLETED" | "CANCELLED";
  customerName: string;
  createdAt: string;
  approvedAt?: string | null;
  completedAt?: string | null;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    price: number;
    subtotal: number;
    image?: string | null;
  }>;
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(() => searchParams.get("orderNumber") ?? "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim()) return;

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const params = new URLSearchParams({ orderNumber: orderNumber.trim() });
      if (phone.trim()) {
        params.append("phone", phone.trim());
      }

      const res = await fetch(`/api/orders/track?${params}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to track order");
      }

      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to find order");
    } finally {
      setLoading(false);
    }
  }

  // Helper to determine status step completion
  const getStepStatus = (step: "placed" | "approved" | "packing" | "completed") => {
    if (!order) return "inactive";
    const status = order.status;

    if (status === "CANCELLED") return "inactive";

    switch (step) {
      case "placed":
        return "completed"; // always completed if order exists
      case "approved":
        return ["APPROVED", "PACKING", "COMPLETED"].includes(status) ? "completed" : status === "PENDING" ? "active" : "inactive";
      case "packing":
        return ["PACKING", "COMPLETED"].includes(status) ? "completed" : status === "APPROVED" ? "active" : "inactive";
      case "completed":
        return status === "COMPLETED" ? "completed" : status === "PACKING" ? "active" : "inactive";
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-850">
      {/* Header */}
      <header className="border-b border-amber-100 bg-white sticky top-0 z-30 shadow-2xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
          <Link href="/" className="text-base sm:text-xl font-bold text-stone-900 flex items-center gap-2" aria-label="Radhe Home">
            <span className="text-xl sm:text-2xl">🌾</span>
            <span className="truncate font-serif">Rajyalakshmi Radhe</span>
          </Link>
          <Link
            href="/products"
            className="rounded-full bg-amber-600 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-amber-700 active:scale-95 transition-all min-h-[40px] flex items-center shrink-0"
          >
            Back to Shop
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="text-center mb-6 sm:mb-8 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900">Track Your Order</h1>
          <p className="text-stone-600 text-xs sm:text-sm max-w-md mx-auto">
            Enter your order number to see real-time updates from our Vijayawada warehouse packing queue.
          </p>
        </div>

        {/* Tracking Search Card */}
        <div className="rounded-2xl border border-amber-100 bg-white p-4 sm:p-6 shadow-xs mb-8">
          <form onSubmit={handleTrack} className="space-y-4">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  Order Number *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 1001"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base sm:text-sm focus:border-amber-500 focus:outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  Phone Number *
                </label>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base sm:text-sm focus:border-amber-500 focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs sm:text-sm font-semibold text-red-600 rounded-xl bg-red-50 border border-red-200 p-3">
                ⚠ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-amber-600 py-3.5 text-sm sm:text-base font-bold text-white hover:bg-amber-700 active:scale-95 disabled:opacity-50 transition-all min-h-[48px] flex items-center justify-center cursor-pointer shadow-xs"
            >
              {loading ? "Locating order in warehouse queue..." : "Track Order Status →"}
            </button>
          </form>
        </div>

        {/* Tracking Details Display */}
        {order && (
          <div className="space-y-6">
            {/* Status overview */}
            <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4 mb-6">
                <div>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Order Reference</p>
                  <h2 className="text-xl font-bold text-stone-900">Order #{order.orderNumber}</h2>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Status</p>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                      order.status === "COMPLETED"
                        ? "bg-green-150 text-green-700"
                        : order.status === "CANCELLED"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>

              {order.status === "CANCELLED" ? (
                <div className="rounded-xl bg-red-50 p-4 text-center">
                  <p className="font-semibold text-red-700">This order has been cancelled.</p>
                  <p className="text-xs text-red-650 mt-1">Please contact support or visit our shop for queries.</p>
                </div>
              ) : (
                /* Step Progress Line */
                <div className="relative pl-8 space-y-8 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-[2px] before:bg-stone-200">
                  {/* Step 1: Placed */}
                  <div className="relative">
                    <span
                      className={`absolute -left-8 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                        getStepStatus("placed") === "completed" ? "bg-amber-600" : "bg-stone-300"
                      }`}
                    >
                      ✓
                    </span>
                    <div>
                      <h3 className="font-bold text-stone-900">Order Placed</h3>
                      <p className="text-xs text-stone-500">
                        Received at {new Date(order.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Approved */}
                  <div className="relative">
                    <span
                      className={`absolute -left-8 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                        getStepStatus("approved") === "completed"
                          ? "bg-amber-600"
                          : getStepStatus("approved") === "active"
                          ? "bg-amber-400 animate-pulse"
                          : "bg-stone-300"
                      }`}
                    >
                      {getStepStatus("approved") === "completed" ? "✓" : "2"}
                    </span>
                    <div>
                      <h3 className="font-bold text-stone-900">Approved by Admin</h3>
                      {order.approvedAt ? (
                        <p className="text-xs text-stone-500 font-medium">
                          Approved at {new Date(order.approvedAt).toLocaleString("en-IN")}
                        </p>
                      ) : (
                        <p className="text-xs text-stone-400">Waiting for invoice approval</p>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Packing */}
                  <div className="relative">
                    <span
                      className={`absolute -left-8 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                        getStepStatus("packing") === "completed"
                          ? "bg-amber-600"
                          : getStepStatus("packing") === "active"
                          ? "bg-amber-400 animate-pulse"
                          : "bg-stone-300"
                      }`}
                    >
                      {getStepStatus("packing") === "completed" ? "✓" : "3"}
                    </span>
                    <div>
                      <h3 className="font-bold text-stone-900">In Packing Queue</h3>
                      {order.status === "PACKING" || order.status === "COMPLETED" ? (
                        <p className="text-xs text-stone-500">
                          Bags are being packed and weighted by warehouse workers
                        </p>
                      ) : (
                        <p className="text-xs text-stone-400">Waiting for packing queue release</p>
                      )}
                    </div>
                  </div>

                  {/* Step 4: Ready */}
                  <div className="relative">
                    <span
                      className={`absolute -left-8 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                        getStepStatus("completed") === "completed"
                          ? "bg-amber-600"
                          : getStepStatus("completed") === "active"
                          ? "bg-amber-400 animate-pulse"
                          : "bg-stone-300"
                      }`}
                    >
                      {getStepStatus("completed") === "completed" ? "✓" : "4"}
                    </span>
                    <div>
                      <h3 className="font-bold text-stone-900">Ready / Completed</h3>
                      {order.completedAt ? (
                        <p className="text-xs text-stone-500 font-medium">
                          Completed at {new Date(order.completedAt).toLocaleString("en-IN")}
                        </p>
                      ) : (
                        <p className="text-xs text-stone-400">Awaiting final loading and handover</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-stone-900 mb-4 text-base">Order Items</h3>
              <div className="divide-y divide-stone-100">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-stone-850 break-words">{item.name}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {item.quantity} {item.unit} · {formatCurrency(item.price)}
                      </p>
                    </div>
                    <span className="font-bold text-stone-900 shrink-0 text-right">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-stone-100 pt-4 mt-2 flex justify-between font-bold text-stone-900">
                <span>Total amount</span>
                <span className="text-amber-800 text-lg">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Loading tracking details...</p>}>
      <TrackOrderContent />
    </Suspense>
  );
}