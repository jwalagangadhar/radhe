"use client";
import { useEffect, useState } from "react";
export function LowStockAlertsPanel() {
    const [alerts, setAlerts] = useState(null);
    const [loading, setLoading] = useState(true);
    async function fetchAlerts() {
        try {
            const res = await fetch("/api/dashboard/low-stock-alerts", {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setAlerts(data);
            }
        }
        catch (err) {
            console.error("Failed to fetch low stock alerts:", err);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);
    if (loading)
        return <p className="text-zinc-500">Loading alerts...</p>;
    if (!alerts || alerts.summary.totalLow === 0) {
        const pendingCount = alerts?.pendingRequests.length ?? 0;
        return (<div className="space-y-4">
        <div className="flex min-h-16 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3">
          <p className="text-sm font-semibold text-emerald-700"><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-500 text-xs font-bold text-white" aria-hidden="true">✓</span>All stock levels healthy</p>
        </div>
      </div>);
    }
    return (<div className="space-y-4">
      {alerts.summary.totalCritical > 0 && (<div className="rounded-xl border border-red-300 bg-red-50 p-4">
          <h3 className="mb-3 font-bold text-red-900">
            🚨 Critical Stock Alert ({alerts.summary.totalCritical})
          </h3>
          <div className="space-y-2">
            {alerts.criticalStock.map((product) => (<div key={product.id} className="flex items-center justify-between bg-white p-2 rounded">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{product.name}</p>
                  <p className="text-xs text-zinc-500">
                    Current: {product.stock} {product.unit} | Min: {product.minStock} {product.unit}
                  </p>
                </div>
                <span className="inline-block rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                  {Math.round((product.stock / product.minStock) * 100)}%
                </span>
              </div>))}
          </div>
        </div>)}

      {alerts.lowStock.length > 0 && (<div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h3 className="mb-3 font-bold text-amber-900">
            ⚠️ Low Stock Alert ({alerts.summary.totalLow})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {alerts.lowStock.map((product) => (<div key={product.id} className="rounded-lg border border-amber-200 bg-white p-3">
                <p className="text-sm font-medium text-zinc-900">{product.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">
                    {product.stock}/{product.minStock} {product.unit}
                  </span>
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-amber-200">
                    <div className="h-full bg-amber-600" style={{
                    width: `${Math.min(100, (product.stock / product.minStock) * 100)}%`,
                }}/>
                  </div>
                </div>
              </div>))}
          </div>
        </div>)}
    </div>);
}
