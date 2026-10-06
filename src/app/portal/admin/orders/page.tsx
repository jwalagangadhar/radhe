"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
import { OrderCard } from "@/components/OrderCard";
import type { OrderWithItems } from "@/lib/types";

export default function AdminOrdersPage() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    const meRes = await fetch("/api/auth/me", { credentials: "include" });
    const me = await meRes.json();
    if (!me.user) {
      window.location.href = "/portal/login";
      return;
    }
    setUser(me.user);

    const params = new URLSearchParams();
    if (filter === "web") params.set("type", "WEB");
    if (filter === "walkin") params.set("type", "WALK_IN");
    if (filter === "draft") params.set("status", "DRAFT");
    if (filter === "pending") params.set("status", "PENDING");

    const res = await fetch(`/api/orders?${params}`, { cache: "no-store", credentials: "include" });
    const data = await res.json();
    setOrders(data.orders ?? []);
  }, [filter]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  async function updateOrder(id: string, body: Record<string, unknown>) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  }

  async function deleteOrder(id: string) {
    if (!confirm("Delete this order? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
      await load();
      alert("Order deleted successfully.");
    } catch (err) {
      alert("Failed to delete order.");
    }
  }

  async function sendSMSInvoice(id: string) {
    try {
      const res = await fetch(`/api/orders/${id}/send-sms`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        alert("SMS Invoice sent successfully!");
      } else {
        alert(data.error ?? "Failed to send SMS Invoice");
      }
    } catch {
      alert("Failed to send SMS Invoice");
    }
  }

  if (!user) return <p className="p-8 text-center">Loading...</p>;

  return (
    <div className="min-h-screen bg-zinc-50">
      <PortalNav role="ADMIN" userName={user.name} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold">Orders &amp; Billing</h1>

        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { key: "all", label: "All" },
            { key: "web", label: "Web Orders" },
            { key: "walkin", label: "Walk-in" },
            { key: "draft", label: "Drafts" },
            { key: "pending", label: "Pending" },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium min-h-[38px] transition ${
                filter === f.key
                  ? "bg-[#2563eb] text-white shadow-xs"
                  : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/portal/admin/take-order"
              className="rounded-full bg-zinc-900 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-amber-400 hover:bg-zinc-800 transition shadow-xs min-h-[38px] flex items-center justify-center"
            >
              ⚡ Take Order (GST)
            </Link>
            <Link
              href="/portal/admin/cash-counter"
              className="rounded-full bg-orange-600 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-orange-700 transition shadow-xs min-h-[38px] flex items-center justify-center"
            >
              🏪 Cash Counter (Non-GST)
            </Link>
          </div>

          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams();
              if (filter === "web") params.set("type", "WEB");
              if (filter === "walkin") params.set("type", "WALK_IN");
              if (filter === "draft") params.set("status", "DRAFT");
              if (filter === "pending") params.set("status", "PENDING");
              // navigate to export endpoint to trigger download
              window.open(`/api/orders/export?${params.toString()}`, "_blank");
            }}
            className="rounded-full bg-green-600 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-green-700 min-h-[38px] self-start sm:self-auto"
          >
            Export CSV
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center shadow-xs">
            <span className="text-4xl">📦</span>
            <h3 className="mt-3 text-lg font-bold text-zinc-900">No orders found</h3>
            <p className="mt-1 text-sm text-zinc-500">
              There are currently no orders under the &quot;{filter}&quot; filter.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/portal/admin/cash-counter"
                className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-orange-700 transition"
              >
                🏪 Open Cash Counter
              </Link>
              <Link
                href="/portal/admin/take-order"
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-amber-400 shadow-xs hover:bg-zinc-800 transition"
              >
                ⚡ Wholesale Order
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                actions={
                  <div className="flex flex-wrap gap-2">
                    {order.status === "DRAFT" && (
                      <button
                        type="button"
                        onClick={() => updateOrder(order.id, { status: "APPROVED" })}
                        className="rounded-xl bg-green-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-green-700 min-h-[42px] inline-flex items-center justify-center active:scale-95 transition shadow-xs"
                      >
                        Approve Draft
                      </button>
                    )}
                    {/* Mark as Paid — shown first for APPROVED orders */}
                    {order.status === "APPROVED" && (
                      <button
                        type="button"
                        onClick={() => updateOrder(order.id, { status: "COMPLETED" })}
                        className="rounded-xl bg-green-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-green-700 min-h-[42px] inline-flex items-center justify-center active:scale-95 transition shadow-xs"
                      >
                        ✅ Mark as Paid
                      </button>
                    )}
                    {order.invoice?.invoiceNumber && (
                      <button
                        type="button"
                        onClick={() => window.open(`/uploads/invoices/${encodeURIComponent(order.invoice!.invoiceNumber)}.pdf`, '_blank')}
                        className="rounded-xl bg-slate-800 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-900 min-h-[42px] inline-flex items-center justify-center active:scale-95 transition shadow-xs"
                      >
                        📄 Download PDF
                      </button>
                    )}
                    {/* Start Packing */}
                    {["PENDING", "APPROVED"].includes(order.status) && (
                      <button
                        type="button"
                        onClick={() => updateOrder(order.id, { status: "PACKING" })}
                        className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-amber-600 min-h-[42px] inline-flex items-center justify-center active:scale-95 transition shadow-xs"
                      >
                        📦 Start Packing
                      </button>
                    )}
                    {/* Packed & Ready — when packing in progress */}
                    {order.status === "PACKING" && (
                      <button
                        type="button"
                        onClick={() => updateOrder(order.id, { status: "COMPLETED" })}
                        className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 min-h-[42px] inline-flex items-center justify-center active:scale-95 transition shadow-xs"
                      >
                        ✅ Mark Paid / Ready
                      </button>
                    )}
                    {!["COMPLETED", "CANCELLED"].includes(order.status) && (
                      <button
                        type="button"
                        onClick={() => updateOrder(order.id, { status: "CANCELLED" })}
                        className="rounded-xl border border-red-300 px-3.5 py-2 text-xs sm:text-sm font-semibold text-red-600 hover:bg-red-50 min-h-[42px] inline-flex items-center justify-center active:scale-95 transition"
                      >
                        Cancel
                      </button>
                    )}
                    {order.status === "COMPLETED" && order.customerPhone && (
                      <button
                        type="button"
                        onClick={() => sendSMSInvoice(order.id)}
                        className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 min-h-[42px] inline-flex items-center justify-center active:scale-95 transition shadow-xs"
                      >
                        📱 Send SMS Invoice
                      </button>
                    )}
                    {["COMPLETED", "CANCELLED"].includes(order.status) && (
                      <button
                        type="button"
                        onClick={() => deleteOrder(order.id)}
                        className="rounded-xl border border-red-300 px-3.5 py-2 text-xs sm:text-sm font-semibold text-red-600 hover:bg-red-50 min-h-[42px] inline-flex items-center justify-center active:scale-95 transition"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
