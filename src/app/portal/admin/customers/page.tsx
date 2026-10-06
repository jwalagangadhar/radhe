"use client";

import { useCallback, useEffect, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
import { formatCurrency } from "@/lib/types";

interface CustomerOrder {
  id: string;
  orderNumber: number;
  total: number;
  status: string;
  createdAt: string;
  invoice?: {
    invoiceNumber: string;
    paymentStatus: string;
  } | null;
}

interface AdminCustomer {
  id: string;
  name: string;
  phone: string;
  phoneVerified: boolean;
  email?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    orders: number;
    addresses: number;
  };
  orders: CustomerOrder[];
}

export default function AdminCustomersPage() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");

  // Selected customer for viewing order history modal
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      const me = await meRes.json();
      if (!me.user) {
        window.location.href = "/portal/login";
        return;
      }
      setUser(me.user);

      const res = await fetch("/api/portal/admin/customers", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle Customer Account Status
  async function handleToggleStatus(customer: AdminCustomer) {
    const nextStatus = customer.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const confirmMsg =
      nextStatus === "SUSPENDED"
        ? `Are you sure you want to suspend customer account ${customer.phone}? They will be blocked from logging in.`
        : `Activate customer account ${customer.phone}?`;

    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/portal/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status.");

      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, status: nextStatus } : c))
      );
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating account status.");
    } finally {
      setActionLoading(false);
    }
  }

  // Filter customers by search term and status
  const filtered = customers.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalOrdersCount = customers.reduce((sum, c) => sum + c._count.orders, 0);
  const activeCount = customers.filter((c) => c.status === "ACTIVE").length;

  return (
    <div className="min-h-screen bg-zinc-50">
      <PortalNav role="ADMIN" userName={user?.name ?? "Admin"} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8 space-y-6">
        {/* Header Title & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">👥</span>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900">
                Customer Accounts &amp; Authentication
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Registered customers verified via Mobile OTP. OTP secrets are strictly protected and never displayed.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="self-start sm:self-auto rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-bold text-zinc-700 shadow-xs hover:bg-zinc-100 active:scale-95 transition flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Customers</p>
            <p className="text-2xl font-black text-zinc-900 mt-1">{customers.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Verified Mobile Numbers</p>
            <p className="text-2xl font-black text-emerald-950 mt-1">
              {customers.filter((c) => c.phoneVerified).length}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Active Accounts</p>
            <p className="text-2xl font-black text-amber-950 mt-1">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Customer Orders</p>
            <p className="text-2xl font-black text-zinc-900 mt-1">{totalOrdersCount}</p>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, mobile, or ID…"
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50/50 pl-10 pr-4 py-2.5 text-sm text-zinc-900 focus:border-amber-600 focus:bg-white focus:outline-none"
            />
            <span className="absolute left-3.5 top-3 text-zinc-400 text-sm">🔍</span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-zinc-500">Status:</span>
            <div className="flex rounded-xl border border-zinc-300 bg-zinc-100 p-1">
              {(["ALL", "ACTIVE", "SUSPENDED"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    statusFilter === st
                      ? "bg-white text-zinc-900 shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {st === "ALL" ? "All" : st === "ACTIVE" ? "Active" : "Suspended"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-sm font-semibold text-zinc-500">Loading customers…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm font-semibold text-zinc-500">
              No customers match your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-700">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-5 py-3.5">Customer Details</th>
                    <th className="px-5 py-3.5">Verified Mobile</th>
                    <th className="px-5 py-3.5">Registration Date</th>
                    <th className="px-5 py-3.5 text-center">Orders</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((customer) => (
                    <tr key={customer.id} className="hover:bg-zinc-50/80 transition">
                      {/* Customer Details */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-zinc-900 text-sm">
                          {customer.name || "Customer"}
                        </div>
                        {customer.email && (
                          <div className="text-xs text-zinc-500 mt-0.5">{customer.email}</div>
                        )}
                        <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                          ID: {customer.id}
                        </div>
                      </td>

                      {/* Verified Mobile Number */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-zinc-900">{customer.phone}</span>
                          {customer.phoneVerified && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                              <span>✓</span>
                              <span>Verified</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Registration Date */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-zinc-600">
                        {new Date(customer.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        <div className="text-[11px] text-zinc-400">
                          {new Date(customer.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Number of Orders */}
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center justify-center rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-black text-amber-900">
                          {customer._count.orders} {customer._count.orders === 1 ? "order" : "orders"}
                        </span>
                      </td>

                      {/* Account Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black tracking-wider uppercase ${
                            customer.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {customer.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(customer)}
                          className="rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-xs hover:bg-zinc-100 transition"
                        >
                          Order History ({customer._count.orders})
                        </button>

                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleToggleStatus(customer)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold shadow-xs transition ${
                            customer.status === "ACTIVE"
                              ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          }`}
                        >
                          {customer.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Security & Compliance Banner */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-100/70 p-4 text-xs text-zinc-600 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>🛡️</span>
            <span>
              <strong>Zero Plaintext Storage:</strong> Customer OTPs are salted, HMAC-hashed, and never visible to portal staff or administrators.
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">ISO/IEC 27001 Compliant Architecture</span>
        </div>
      </main>

      {/* Customer Order History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 p-5">
              <div>
                <h3 className="text-lg font-black text-zinc-900">
                  Order History: {selectedCustomer.name || "Customer"}
                </h3>
                <p className="text-xs text-zinc-500 font-mono">
                  Phone: {selectedCustomer.phone} · Total Orders: {selectedCustomer._count.orders}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {selectedCustomer.orders.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500">
                  This customer has not placed any orders yet.
                </div>
              ) : (
                selectedCustomer.orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4 text-xs sm:text-sm hover:bg-zinc-50 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-zinc-900 text-base">
                          Order #{ord.orderNumber}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-700 uppercase">
                          {ord.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Date: {new Date(ord.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {ord.invoice && (
                        <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          Invoice: {ord.invoice.invoiceNumber} ({ord.invoice.paymentStatus})
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-base sm:text-lg font-black text-amber-900">
                        {formatCurrency(ord.total)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-zinc-200 p-4 bg-zinc-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
