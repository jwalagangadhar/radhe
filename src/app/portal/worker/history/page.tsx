"use client";

import { useCallback, useEffect, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
import { formatCurrency, orderStatusLabel, orderTypeLabel } from "@/lib/types";
import type { OrderWithItems } from "@/lib/types";

export default function WorkerHistoryPage() {
  const [user, setUser] = useState<{ name: string; role: "ADMIN" | "WORKER" } | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [printOrder, setPrintOrder] = useState<OrderWithItems | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
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
      if (filter === "completed") params.set("status", "COMPLETED");
      if (filter === "cancelled") params.set("status", "CANCELLED");

      const res = await fetch(`/api/orders?${params}`, { cache: "no-store", credentials: "include" });
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return <p className="p-8 text-center">Loading...</p>;

  return (
    <div className="min-h-screen bg-zinc-50">
      <PortalNav role={user.role === "ADMIN" ? "ADMIN" : "WORKER"} userName={user.name} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">Order History</h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">View all bills and reprint receipts for any past sale.</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 min-h-[38px] self-start sm:self-auto"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { key: "all", label: "All Orders" },
            { key: "completed", label: "Completed" },
            { key: "cancelled", label: "Cancelled" },
            { key: "web", label: "Online" },
            { key: "walkin", label: "Walk-in" },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium min-h-[38px] transition ${
                filter === f.key
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Orders Table / Cards */}
        {orders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-500">
            No orders found matching the filter.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {orders.map((order) => {
              const total = order.items.reduce(
                (s, item) => s + item.unitPrice * item.quantity,
                0
              );
              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3"
                >
                  {/* Order header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-zinc-900 text-sm">
                        Order #{order.orderNumber}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(order.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        order.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800"
                          : order.status === "CANCELLED"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {orderStatusLabel(order.status)}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600">
                        {orderTypeLabel(order.type)}
                      </span>
                    </div>
                  </div>

                  {/* Customer info */}
                  {(order.customerName || order.customerPhone) && (
                    <p className="text-xs text-zinc-600">
                      👤 {order.customerName || "—"}
                      {order.customerPhone && (
                        <>
                          {" "}· 📞{" "}
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="text-blue-600 hover:underline font-semibold"
                          >
                            {order.customerPhone}
                          </a>
                        </>
                      )}
                    </p>
                  )}

                  {/* Items */}
                  <ul className="space-y-1">
                    {order.items.slice(0, 4).map((item) => (
                      <li
                        key={item.id}
                        className="flex justify-between text-xs text-zinc-700"
                      >
                        <span>{item.product.name} × {item.quantity} {item.product.unit}</span>
                        <span className="font-semibold">{formatCurrency(item.unitPrice * item.quantity)}</span>
                      </li>
                    ))}
                    {order.items.length > 4 && (
                      <li className="text-[11px] text-zinc-400">+{order.items.length - 4} more items</li>
                    )}
                  </ul>

                  {/* Total & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-2">
                    <span className="text-sm font-bold text-zinc-900">
                      Total: {formatCurrency(total)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPrintOrder(order)}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 transition-colors min-h-[40px]"
                    >
                      🖨️ Reprint Bill
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────── REPRINT RECEIPT MODAL ─────────── */}
      {printOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-zinc-900 px-4 sm:px-5 py-3 print:hidden">
              <span className="text-sm font-bold text-amber-400">🧾 Bill #{printOrder.orderNumber}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="rounded-xl bg-emerald-600 px-3.5 sm:px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 min-h-[40px] flex items-center justify-center"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => setPrintOrder(null)}
                  className="rounded-xl bg-zinc-700 px-3 sm:px-3.5 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-600 min-h-[40px] flex items-center justify-center"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Printable receipt */}
            <div
              id="reprint-receipt"
              className="flex-1 overflow-y-auto bg-white p-6 text-black font-mono text-xs print:overflow-visible print:p-2"
            >
              <div className="text-center border-b-2 border-black pb-3 mb-3">
                <h1 className="text-base font-extrabold uppercase">Radhe Wholesale & Retail Traders</h1>
                <p className="text-[10px] text-zinc-600">123 Commercial Market Yard, Mumbai</p>
                <p className="text-[10px] text-zinc-600">Phone: +91 9876543210 | GSTIN: 27AAAAA0000A1Z5</p>
              </div>

              <div className="mb-3 space-y-0.5">
                <div className="flex justify-between">
                  <span className="font-bold">Bill No:</span>
                  <span className="font-bold text-amber-700">#{printOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{new Date(printOrder.createdAt).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-semibold">{printOrder.customerName || "Counter Customer"}</span>
                </div>
                {printOrder.customerPhone && (
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span>{printOrder.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span>{orderTypeLabel(printOrder.type)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-semibold">{orderStatusLabel(printOrder.status)}</span>
                </div>
              </div>

              <table className="w-full border-collapse border-t-2 border-b border-black text-[11px] mb-3">
                <thead>
                  <tr className="border-b border-black">
                    <th className="py-1 text-left">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {printOrder.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-dashed border-zinc-300">
                      <td className="py-1 font-semibold">{item.product.name}</td>
                      <td className="py-1 text-center">{item.quantity} {item.product.unit}</td>
                      <td className="py-1 text-right">₹{item.unitPrice.toFixed(2)}</td>
                      <td className="py-1 text-right font-bold">₹{(item.unitPrice * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-0.5 border-b-2 border-black pb-3 mb-3 text-[11px]">
                <div className="flex justify-between text-base font-extrabold">
                  <span>TOTAL:</span>
                  <span>
                    ₹{printOrder.items
                      .reduce((s, i) => s + i.unitPrice * i.quantity, 0)
                      .toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {printOrder.notes && (
                <div className="mb-3 text-[10px] text-zinc-600">
                  <span className="font-bold">Notes:</span> {printOrder.notes}
                </div>
              )}

              <div className="text-center text-[10px] text-zinc-500 space-y-0.5">
                <p className="font-bold text-black">Thank you for your purchase!</p>
                <p>Goods once sold will not be taken back.</p>
                <p>UPI: radhetraders@sbi</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body > * { display: none !important; }
          #reprint-receipt { display: block !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
