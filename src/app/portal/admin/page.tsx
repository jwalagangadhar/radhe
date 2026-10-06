"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PortalNav } from "@/components/PortalNav";
import { OrderTakingEngine } from "@/components/erp/OrderTakingEngine";
import { GstBillingModule } from "@/components/erp/GstBillingModule";
import { CashCounterBilling } from "@/components/erp/CashCounterBilling";
import { LedgerViewer } from "@/components/erp/LedgerViewer";
import { ComplianceExporter } from "@/components/erp/ComplianceExporter";
import { PrintControllerModal } from "@/components/erp/PrintControllerModal";

interface ErpMetrics {
  dailySales: number;
  todayOrderCount: number;
  pendingOrdersCount: number;
  totalReceivables: number;
  gstLiability: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
}

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "ORDER_TAKERS" | "GST_BILLING" | "CASH_COUNTER" | "LEDGER" | "COMPLIANCE"
  >("OVERVIEW");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      ["OVERVIEW", "ORDER_TAKERS", "GST_BILLING", "CASH_COUNTER", "LEDGER", "COMPLIANCE"].includes(tabParam)
    ) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const [metrics, setMetrics] = useState<ErpMetrics>({
    dailySales: 0,
    todayOrderCount: 0,
    pendingOrdersCount: 0,
    totalReceivables: 0,
    gstLiability: { cgst: 0, sgst: 0, igst: 0, total: 0 },
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [activeRole, setActiveRole] = useState<"ADMIN" | "SALES_AGENT" | "BILLING_CLERK" | "WAREHOUSE_MANAGER">("ADMIN");

  // Print Modal State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printDocData, setPrintDocData] = useState<any>(null);

  const fetchErpMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/erp/metrics");
      const data = await res.json();
      if (data.metrics) setMetrics(data.metrics);
      if (data.recentOrders) setRecentOrders(data.recentOrders);
    } catch (e) {
      console.error("Failed to fetch ERP metrics", e);
    }
  }, []);

  useEffect(() => {
    fetchErpMetrics();
  }, [fetchErpMetrics]);

  const handleOpenPrintModal = (docData: any) => {
    setPrintDocData(docData);
    setIsPrintOpen(true);
  };

  const [currentUserName, setCurrentUserName] = useState("Admin");

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.name) {
          setCurrentUserName(data.user.name);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 font-sans text-zinc-900 pb-12">
      <PortalNav role="ADMIN" userName={currentUserName} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Header & RBAC Access Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl sm:rounded-2xl bg-zinc-900 p-4 sm:p-6 text-white shadow-xl">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="rounded-md bg-amber-500/20 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold text-amber-400 border border-amber-500/30">
                UNIFIED WEB ERP & INVOICING PLATFORM
              </span>
              <span className="text-[11px] sm:text-xs text-zinc-400 font-mono">Tally Prime + Vyapar Workflows</span>
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-100">
              Admin Command & Control Center
            </h1>
          </div>

          {/* Role Indicator Badge */}
          <div className="flex items-center gap-2 rounded-xl bg-zinc-800 p-2 border border-zinc-700 text-xs self-start sm:self-auto">
            <span className="px-2 text-zinc-400 font-semibold">Active Role:</span>
            <span className="rounded-lg bg-amber-500 px-2.5 sm:px-3 py-1 font-bold text-zinc-950">
              👑 ADMIN
            </span>
          </div>
        </div>

        {/* High-Density Real-Time Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Daily Sales Card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="font-semibold uppercase">Daily Sales Today</span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Realtime</span>
            </div>
            <p className="text-2xl font-extrabold text-zinc-900">
              ₹{metrics.dailySales.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-zinc-500 font-medium">{metrics.todayOrderCount} orders processed today</p>
          </div>

          {/* Receivables Card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="font-semibold uppercase">Pending Receivables</span>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Unpaid Invoices</span>
            </div>
            <p className="text-2xl font-extrabold text-amber-700">
              ₹{metrics.totalReceivables.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-zinc-500 font-medium">Outstanding Customer Balance</p>
          </div>

          {/* Pending Orders Card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="font-semibold uppercase">Pending Orders</span>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">Awaiting Action</span>
            </div>
            <p className="text-2xl font-extrabold text-zinc-900">
              {metrics.pendingOrdersCount}
            </p>
            <p className="text-xs text-zinc-500 font-medium">Ready for Approval & Invoicing</p>
          </div>

          {/* GST Liabilities Card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="font-semibold uppercase">GST Tax Liability</span>
              <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">CGST/SGST/IGST</span>
            </div>
            <p className="text-2xl font-extrabold text-purple-900">
              ₹{metrics.gstLiability.total.toLocaleString("en-IN")}
            </p>
            <div className="flex justify-between text-[11px] font-mono text-zinc-600">
              <span>CGST: ₹{metrics.gstLiability.cgst.toFixed(0)}</span>
              <span>SGST: ₹{metrics.gstLiability.sgst.toFixed(0)}</span>
              <span>IGST: ₹{metrics.gstLiability.igst.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Global Navigation & Quick Actions Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
            {[
              { id: "OVERVIEW", label: "ERP Metrics & Orders", icon: "📊" },
              { id: "ORDER_TAKERS", label: "Fast Order Taking", icon: "⚡" },
              { id: "GST_BILLING", label: "GST Compliance & Invoices", icon: "🧾" },
              { id: "CASH_COUNTER", label: "Cash Counter Billing", icon: "🏪" },
              { id: "LEDGER", label: "Double-Entry Ledger", icon: "📖" },
              { id: "COMPLIANCE", label: "Compliance Exports", icon: "📋" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition whitespace-nowrap min-h-[38px] ${
                  activeTab === tab.id
                    ? "bg-amber-500 text-zinc-950 shadow-md"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Global Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100">
            <button
              onClick={() => setActiveTab("ORDER_TAKERS")}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-zinc-800 transition min-h-[38px] flex-1 sm:flex-none text-center"
            >
              + New Order
            </button>
            <button
              onClick={() => setActiveTab("GST_BILLING")}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition min-h-[38px] flex-1 sm:flex-none text-center"
            >
              + GST Invoice
            </button>
            <button
              onClick={() => setActiveTab("CASH_COUNTER")}
              className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-400 transition min-h-[38px] flex-1 sm:flex-none text-center"
            >
              🏪 Cash Memo
            </button>
          </div>
        </div>

        {/* Tab Content Rendering */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-200 pb-3">
                <h3 className="text-base font-bold text-zinc-900">Recent Customer Orders & Transactions</h3>
                <span className="text-xs text-zinc-500 font-mono">Real-time ERP Audit Trail</span>
              </div>

              {/* Mobile Recent Orders Cards (< sm) */}
              <div className="block sm:hidden space-y-3">
                {recentOrders.map((o) => (
                  <div key={`mobile-ro-${o.id}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-700 text-sm">Order #{o.orderNumber}</span>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                        {o.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-zinc-900">{o.customerName || "Counter Sale"}</p>
                        <p className="text-[10px] text-zinc-500">{o.customerPhone || "—"}</p>
                      </div>
                      <span className="rounded bg-zinc-200/70 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                        {o.type}
                      </span>
                    </div>

                    {(o.invoice || o.deliveryChallan) && (
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                        {o.invoice && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 font-bold border border-emerald-200">
                            📄 {o.invoice.invoiceNumber}
                          </span>
                        )}
                        {o.deliveryChallan && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 font-bold border border-blue-200">
                            🚚 {o.deliveryChallan.challanNumber}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-zinc-200 pt-2">
                      <span className="font-black text-sm text-zinc-900">₹{o.total.toLocaleString("en-IN")}</span>
                      <button
                        onClick={() =>
                          handleOpenPrintModal({
                            type: "ORDER_SLIP",
                            orderNumber: o.orderNumber,
                            date: o.createdAt,
                            customer: {
                              name: o.customerName || "Customer",
                              phone: o.customerPhone || "",
                              address: o.deliveryAddress,
                            },
                            items: (o.items || []).map((i: any) => ({
                              name: i.product?.name || "Product",
                              hsnCode: i.hsnCode,
                              quantity: i.quantity,
                              unit: i.product?.unit || "kg",
                              unitPrice: i.unitPrice,
                              subtotal: i.subtotal,
                            })),
                            grandTotal: o.total,
                          })
                        }
                        className="rounded-lg bg-zinc-900 px-3 py-1.5 min-h-[36px] inline-flex items-center justify-center text-[11px] font-bold text-amber-400 hover:bg-zinc-800 transition active:scale-95"
                      >
                        🖨️ Print
                      </button>
                    </div>
                  </div>
                ))}
                {recentOrders.length === 0 && (
                  <p className="py-6 text-center text-xs text-zinc-400">No recent orders recorded.</p>
                )}
              </div>

              {/* Desktop Table (>= sm) */}
              <div className="hidden sm:block overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase">
                    <tr>
                      <th className="p-3">Order No</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Invoice #</th>
                      <th className="p-3">Challan #</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-zinc-50">
                        <td className="p-3 font-bold text-amber-700">#{o.orderNumber}</td>
                        <td className="p-3">
                          <p className="font-semibold text-zinc-900">{o.customerName || "Counter Sale"}</p>
                          <p className="text-[10px] text-zinc-500">{o.customerPhone || "-"}</p>
                        </td>
                        <td className="p-3">
                          {o.invoice ? (
                            <span className="font-mono text-xs text-emerald-700 font-bold">{o.invoice.invoiceNumber}</span>
                          ) : (
                            <span className="text-[10px] text-zinc-400">Cash Memo</span>
                          )}
                        </td>
                        <td className="p-3">
                          {o.deliveryChallan ? (
                            <span className="font-mono text-xs text-blue-700 font-bold">{o.deliveryChallan.challanNumber}</span>
                          ) : (
                            <span className="text-[10px] text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                            {o.type}
                          </span>
                        </td>
                        <td className="p-3 font-extrabold text-zinc-900">₹{o.total.toLocaleString("en-IN")}</td>
                        <td className="p-3">
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                            {o.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() =>
                              handleOpenPrintModal({
                                type: "ORDER_SLIP",
                                orderNumber: o.orderNumber,
                                date: o.createdAt,
                                customer: {
                                  name: o.customerName || "Customer",
                                  phone: o.customerPhone || "",
                                  address: o.deliveryAddress,
                                },
                                items: (o.items || []).map((i: any) => ({
                                  name: i.product?.name || "Product",
                                  hsnCode: i.hsnCode,
                                  quantity: i.quantity,
                                  unit: i.product?.unit || "kg",
                                  unitPrice: i.unitPrice,
                                  subtotal: i.subtotal,
                                })),
                                grandTotal: o.total,
                              })
                            }
                            className="rounded bg-zinc-900 px-3 py-1.5 min-h-[34px] inline-flex items-center justify-center text-[11px] font-bold text-amber-400 hover:bg-zinc-800 transition"
                          >
                            🖨️ Multi-Copy Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "ORDER_TAKERS" && (
          <OrderTakingEngine
            onOrderCreated={fetchErpMetrics}
            onOpenPrintModal={handleOpenPrintModal}
          />
        )}

        {activeTab === "GST_BILLING" && (
          <GstBillingModule
            onInvoiceCreated={fetchErpMetrics}
            onOpenPrintModal={handleOpenPrintModal}
          />
        )}

        {activeTab === "CASH_COUNTER" && (
          <CashCounterBilling
            onOpenPrintModal={handleOpenPrintModal}
          />
        )}

        {activeTab === "LEDGER" && <LedgerViewer />}

        {activeTab === "COMPLIANCE" && <ComplianceExporter />}

        {/* Dedicated Multi-Copy Print Controller Modal */}
        {printDocData && (
          <PrintControllerModal
            isOpen={isPrintOpen}
            onClose={() => setIsPrintOpen(false)}
            documentData={printDocData}
          />
        )}
      </main>
    </div>
  );
}

export default function AdminErpDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-100 p-8 text-center text-zinc-500 font-medium flex items-center justify-center">
          Loading Admin Command Center...
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
