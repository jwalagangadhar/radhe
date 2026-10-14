"use client";
import { useEffect, useState } from "react";
import { formatQuantity } from "@/lib/types";
export function StockAlertsPanel({ products: passedProducts } = {}) {
    const [fetchedAlerts, setFetchedAlerts] = useState([]);
    const [loading, setLoading] = useState(!passedProducts);
    const alerts = passedProducts
        ? passedProducts.filter((p) => p.active && p.stock <= p.minStock)
        : fetchedAlerts;
    async function loadAlerts() {
        try {
            const res = await fetch("/api/products?active=true");
            if (res.ok) {
                const data = await res.json();
                const lowStock = (data.products ?? []).filter((p) => p.stock <= p.minStock);
                setFetchedAlerts(lowStock);
            }
        }
        catch (err) {
            console.error("Failed to load stock alerts", err);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        if (passedProducts)
            return;
        loadAlerts();
        const interval = setInterval(loadAlerts, 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, [passedProducts]);
    if (loading)
        return null;
    if (alerts.length === 0)
        return null;
    return (<div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
        <span className="text-xl">⚠️</span>
        <h2>Low Stock Alerts ({alerts.length})</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {alerts.map((product) => (<div key={product.id} className="flex items-center justify-between rounded-lg bg-white p-3 border border-red-100 shadow-sm gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-zinc-900 truncate">{product.name}</p>
              <p className="text-xs text-zinc-500">Min limit: {formatQuantity(product.minStock, product.unit)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`font-bold text-sm ${product.stock === 0 ? "text-red-600" : "text-amber-600"}`}>
                {product.stock === 0 ? "Out of Stock" : formatQuantity(product.stock, product.unit)}
              </p>
              <p className="text-[10px] text-zinc-400">Max limit: {product.maxStock} {product.unit}</p>
            </div>
          </div>))}
      </div>
    </div>);
}
