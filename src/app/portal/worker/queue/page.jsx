"use client";
import { useCallback, useEffect, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
import { OrderCard } from "@/components/OrderCard";
export default function WorkerQueuePage() {
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const load = useCallback(async () => {
        const meRes = await fetch("/api/auth/me", { credentials: "include" });
        const me = await meRes.json();
        if (!me.user) {
            window.location.href = "/portal/login";
            return;
        }
        setUser(me.user);
        const res = await fetch("/api/orders", { cache: "no-store", credentials: "include" });
        const data = await res.json();
        const active = (data.orders ?? []).filter((o) => ["PENDING", "APPROVED", "PACKING"].includes(o.status));
        setOrders(active);
    }, []);
    useEffect(() => {
        load();
        const interval = setInterval(load, 8000);
        return () => clearInterval(interval);
    }, [load]);
    async function updateStatus(id, status) {
        await fetch(`/api/orders/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        await load();
    }
    if (!user)
        return <p className="p-8 text-center">Loading...</p>;
    return (<div className="min-h-screen bg-zinc-50">
      <PortalNav role={user.role === "ADMIN" ? "ADMIN" : "WORKER"} userName={user.name}/>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Packing &amp; Fulfillment Queue</h1>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 self-start sm:self-auto">
            Auto-refreshes every 8s
          </span>
        </div>

        {orders.length === 0 ? (<p className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 sm:p-12 text-center text-zinc-500">
            No active orders in the packing queue right now.
          </p>) : (<div className="grid gap-4 lg:grid-cols-2">
            {orders.map((order) => (<OrderCard key={order.id} order={order} actions={<div className="flex flex-wrap gap-2">
                    {/* 1. Mark as Paid — shown first for APPROVED orders */}
                    {order.status === "APPROVED" && (<button type="button" onClick={() => updateStatus(order.id, "COMPLETED")} className="rounded-xl bg-green-600 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-green-700 min-h-[44px] inline-flex items-center justify-center active:scale-95 transition shadow-xs">
                        ✅ Mark as Paid
                      </button>)}
                    {/* 2. Start Packing — for PENDING or APPROVED */}
                    {["PENDING", "APPROVED"].includes(order.status) && (<button type="button" onClick={() => updateStatus(order.id, "PACKING")} className="rounded-xl bg-amber-500 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-amber-600 min-h-[44px] inline-flex items-center justify-center active:scale-95 transition shadow-xs">
                        📦 Start Packing
                      </button>)}
                    {/* 3. Packed & Ready — when packing is in progress */}
                    {order.status === "PACKING" && (<button type="button" onClick={() => updateStatus(order.id, "COMPLETED")} className="rounded-xl bg-blue-600 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-blue-700 min-h-[44px] inline-flex items-center justify-center active:scale-95 transition shadow-xs">
                        ✅ Packed &amp; Ready
                      </button>)}
                  </div>}/>))}
          </div>)}
      </div>
    </div>);
}
