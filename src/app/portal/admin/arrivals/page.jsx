"use client";
import { useCallback, useEffect, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
import { formatCurrency, formatQuantity } from "@/lib/types";
export default function AdminArrivalsPage() {
    const [user, setUser] = useState(null);
    const [arrivals, setArrivals] = useState([]);
    const [adjustments, setAdjustments] = useState([]);
    const [products, setProducts] = useState([]);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    // Filters & Tabs
    const [activeTab, setActiveTab] = useState("ARRIVALS");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    // Modal State
    const [showArrivalModal, setShowArrivalModal] = useState(false);
    const [showScrapModal, setShowScrapModal] = useState(false);
    // Arrival Form states
    const [productId, setProductId] = useState("");
    const [supplierName, setSupplierName] = useState("");
    const [totalWeight, setTotalWeight] = useState("");
    const [costPerUnit, setCostPerUnit] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    // Scrap Form states
    const [scrapProductId, setScrapProductId] = useState("");
    const [scrapWeight, setScrapWeight] = useState("");
    const [scrapReason, setScrapReason] = useState("Unloading spill / Damaged raw material");
    const loadData = useCallback(async () => {
        try {
            const meRes = await fetch("/api/auth/me", { credentials: "include" });
            const me = await meRes.json();
            if (!me.user || me.user.role !== "ADMIN") {
                window.location.href = "/portal/login";
                return;
            }
            setUser(me.user);
            const [arrivalsRes, productsRes, adjustmentsRes, requestsRes] = await Promise.all([
                fetch("/api/stock-arrivals", { credentials: "include" }),
                fetch("/api/products?active=true", { credentials: "include" }),
                fetch("/api/stock-adjustments", { credentials: "include" }),
                fetch("/api/stock-requests?status=PENDING", { credentials: "include" }),
            ]);
            if (arrivalsRes.ok) {
                const data = await arrivalsRes.json();
                setArrivals(data.arrivals ?? []);
            }
            if (productsRes.ok) {
                const data = await productsRes.json();
                const prodList = data.products ?? [];
                setProducts(prodList);
                if (prodList.length > 0 && !productId) {
                    setProductId(prodList[0].id);
                    setScrapProductId(prodList[0].id);
                }
            }
            if (adjustmentsRes.ok) {
                const data = await adjustmentsRes.json();
                setAdjustments(data.adjustments ?? []);
            }
            if (requestsRes.ok) {
                const reqData = await requestsRes.json();
                setPendingRequestsCount(reqData.requests?.length ?? 0);
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    }, [productId]);
    useEffect(() => {
        loadData();
    }, [loadData]);
    async function handleAddArrival(e) {
        e.preventDefault();
        if (!productId || !supplierName.trim() || !totalWeight || !costPerUnit) {
            setMessage({ type: "error", text: "Please fill out all required fields." });
            return;
        }
        setSubmitting(true);
        setMessage(null);
        try {
            const res = await fetch("/api/stock-arrivals", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId,
                    supplierName: supplierName.trim(),
                    totalWeight: Number(totalWeight),
                    costPerUnit: Number(costPerUnit),
                    vehicleNumber: vehicleNumber.trim() || undefined,
                    note: note.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error ?? "Failed to log stock arrival");
            }
            setMessage({ type: "success", text: "Stock arrival logged successfully!" });
            setSupplierName("");
            setTotalWeight("");
            setCostPerUnit("");
            setVehicleNumber("");
            setNote("");
            setShowArrivalModal(false);
            await loadData();
        }
        catch (err) {
            setMessage({
                type: "error",
                text: err instanceof Error ? err.message : "Something went wrong",
            });
        }
        finally {
            setSubmitting(false);
        }
    }
    async function handleLogScrap(e) {
        e.preventDefault();
        if (!scrapProductId || !scrapWeight) {
            alert("Please select product and scrap weight.");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch("/api/stock-adjustments", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: scrapProductId,
                    quantity: -Math.abs(Number(scrapWeight)), // negative for loss
                    reason: `SCRAP/WASTAGE: ${scrapReason}`,
                }),
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error || "Failed to log scrap");
            alert("Scrap loss recorded successfully!");
            setScrapWeight("");
            setShowScrapModal(false);
            await loadData();
        }
        catch (err) {
            alert(err.message);
        }
        finally {
            setSubmitting(false);
        }
    }
    async function handleDeleteArrival(id) {
        if (!confirm("Are you sure you want to delete this arrival? Unpacked stock will be decremented.")) {
            return;
        }
        try {
            const res = await fetch(`/api/stock-arrivals?id=${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error ?? "Failed to delete arrival");
            }
            await loadData();
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete arrival");
        }
    }
    // ── Metrics Calculations ──────────────────────────────────────────────────
    const totalArrivalWeightKg = arrivals.reduce((sum, a) => sum + a.totalWeight, 0);
    const totalProcurementCost = arrivals.reduce((sum, a) => sum + a.totalWeight * a.costPerUnit, 0);
    const totalUnpackedStockKg = products.reduce((sum, p) => sum + p.unpackedStock, 0);
    // Maximum Wholesale Bags Yield Estimation
    const maxBagsYield = products.reduce((sum, p) => {
        const bagW = p.bagWeight || 50;
        return sum + Math.floor(p.unpackedStock / bagW);
    }, 0);
    // Scrap / Wastage Pit Loss Total
    const scrapLossesKg = Math.abs(adjustments
        .filter((a) => a.quantity < 0)
        .reduce((sum, a) => sum + a.quantity, 0));
    // Filtered Arrivals Table
    const filteredArrivals = arrivals.filter((arr) => {
        const matchesSearch = arr.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            arr.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (arr.vehicleNumber && arr.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()));
        const remaining = arr.totalWeight - arr.usedWeight;
        if (statusFilter === "UNPACKED" && remaining <= 0)
            return false;
        if (statusFilter === "PROCESSED" && remaining > 0)
            return false;
        return matchesSearch;
    });
    if (loading || !user) {
        return (<div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
          <p className="text-xs text-zinc-400 font-medium">Loading Inbound Stock Command Center...</p>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-16">
      <PortalNav role="ADMIN" userName={user.name}/>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Header Hero Bar */}
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/30 p-6 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30">
                  🚛 TRUCK ARRIVALS & RAW MATERIAL HUB
                </span>
                <span className="text-xs font-mono text-zinc-400">Realtime Weight & Bags Yield</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Inbound Stock & Raw Materials
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Log incoming raw trucks, monitor unpacked stock yield, estimate bag conversions, and track scrap pit losses.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a href="/portal/admin/stock-requests" className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition shadow-sm">
                <span>📦 Packing Requests</span>
                {pendingRequestsCount > 0 ? (<span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-zinc-950">
                    {pendingRequestsCount} Pending
                  </span>) : (<span className="text-[10px] text-zinc-400">All cleared</span>)}
              </a>
              <button type="button" onClick={() => setShowArrivalModal(true)} className="rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-zinc-950 shadow-lg hover:bg-amber-400 transition">
                🚚 Log Truck Arrival
              </button>
              <button type="button" onClick={() => setShowScrapModal(true)} className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition">
                ♻️ Log Scrap / Loss
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
              <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total Arrivals Logged</p>
              <p className="text-xl font-black text-amber-400 mt-1">
                {(totalArrivalWeightKg / 1000).toFixed(2)} <span className="text-xs font-normal text-zinc-400">Tons</span>
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{totalArrivalWeightKg.toLocaleString()} kg total</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
              <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Unpacked Raw Stock</p>
              <p className="text-xl font-black text-emerald-400 mt-1">
                {totalUnpackedStockKg.toLocaleString()} <span className="text-xs font-normal text-zinc-400">kg</span>
              </p>
              <p className="text-[10px] text-emerald-500/80 mt-0.5">Ready for packing</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
              <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Max Bags Yield</p>
              <p className="text-xl font-black text-amber-500 mt-1">
                {maxBagsYield} <span className="text-xs font-normal text-zinc-400">Bags</span>
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Est. @ 50kg/bag</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
              <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Scrap & Spill Loss</p>
              <p className="text-xl font-black text-red-400 mt-1">
                {scrapLossesKg.toLocaleString()} <span className="text-xs font-normal text-zinc-400">kg</span>
              </p>
              <p className="text-[10px] text-red-400/70 mt-0.5">Scrap pit record</p>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
              <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Procurement Value</p>
              <p className="text-xl font-black text-amber-300 mt-1">
                {formatCurrency(totalProcurementCost)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Inbound invoice total</p>
            </div>
          </div>
        </div>

        {/* Product Raw Stock Overview Cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <span>🌾</span> Raw Material Unpacked Stock by Product
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {products.map((prod) => {
            const bagSize = prod.bagWeight || 50;
            const estBags = Math.floor(prod.unpackedStock / bagSize);
            return (<div key={prod.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-2 hover:border-zinc-700 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-white">{prod.name}</h3>
                      <p className="text-[10px] text-zinc-500">{prod.category}</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                      Unpacked
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1 border-t border-zinc-800">
                    <div>
                      <p className="text-lg font-black text-emerald-400">
                        {prod.unpackedStock.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">{prod.unit}</span>
                      </p>
                      <p className="text-[10px] text-zinc-400">Raw Stock Left</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-400">
                        ~{estBags} <span className="text-[10px] text-zinc-500 font-normal">Bags</span>
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        ({bagSize}kg) or {Math.floor(prod.unpackedStock)} × 1kg
                      </p>
                    </div>
                  </div>
                </div>);
        })}
          </div>
        </div>

        {/* Filter & View Tabs */}
        <div className="rounded-2xl sm:rounded-3xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setActiveTab("ARRIVALS")} className={`rounded-xl px-3.5 sm:px-4 py-2 text-xs font-extrabold transition min-h-[38px] ${activeTab === "ARRIVALS"
            ? "bg-amber-500 text-zinc-950 shadow"
            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                🚛 Stock Arrivals Log ({arrivals.length})
              </button>
              <button type="button" onClick={() => setActiveTab("SCRAP_PIT")} className={`rounded-xl px-3.5 sm:px-4 py-2 text-xs font-extrabold transition min-h-[38px] ${activeTab === "SCRAP_PIT"
            ? "bg-red-500 text-white shadow"
            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                ♻️ Scrap & Loss History ({adjustments.filter((a) => a.quantity < 0).length})
              </button>
            </div>

            {activeTab === "ARRIVALS" && (<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
                <input type="text" placeholder="Search product, truck number, supplier..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500 w-full sm:w-64 min-h-[38px]"/>

                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white outline-none focus:border-amber-500 min-h-[38px]">
                  <option value="ALL">All Arrivals</option>
                  <option value="UNPACKED">Unpacked Active</option>
                  <option value="PROCESSED">Fully Processed</option>
                </select>
              </div>)}
          </div>

          {/* Table Content */}
          {activeTab === "ARRIVALS" ? (<div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              {filteredArrivals.length === 0 ? (<div className="py-12 text-center text-zinc-500 text-sm">
                  No stock arrivals match your filters.
                </div>) : (<table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Supplier & Truck</th>
                      <th className="px-4 py-3">Total Arrival</th>
                      <th className="px-4 py-3">Packed vs Remaining</th>
                      <th className="px-4 py-3">Unit Cost & Total</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredArrivals.map((arr) => {
                    const remaining = arr.totalWeight - arr.usedWeight;
                    const totalCost = arr.totalWeight * arr.costPerUnit;
                    const canDelete = arr.usedWeight === 0;
                    const packedPercent = Math.min(100, Math.round((arr.usedWeight / arr.totalWeight) * 100));
                    return (<tr key={arr.id} className="hover:bg-zinc-800/40 transition-colors">
                          <td className="px-4 py-3 text-zinc-400 whitespace-nowrap font-mono">
                            {new Date(arr.createdAt).toLocaleDateString("en-IN")}
                          </td>

                          <td className="px-4 py-3 font-bold text-white">
                            {arr.product.name}
                          </td>

                          <td className="px-4 py-3">
                            <p className="font-semibold text-zinc-200">{arr.supplierName}</p>
                            {arr.vehicleNumber ? (<span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                                🚛 {arr.vehicleNumber}
                              </span>) : (<span className="text-[10px] text-zinc-500">No Truck Reg</span>)}
                          </td>

                          <td className="px-4 py-3 font-extrabold text-amber-400 whitespace-nowrap">
                            {formatQuantity(arr.totalWeight, arr.product.unit)}
                          </td>

                          <td className="px-4 py-3 min-w-[160px]">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-zinc-400">Packed: {arr.usedWeight}kg</span>
                                <span className="font-bold text-emerald-400">Left: {remaining}kg</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500" style={{ width: `${packedPercent}%` }}></div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="font-bold text-white">₹{arr.costPerUnit}/kg</p>
                            <p className="text-[10px] text-zinc-400">Tot: {formatCurrency(totalCost)}</p>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            {remaining <= 0 ? (<span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] font-bold text-zinc-400 border border-zinc-700">
                                ⚪ Fully Packed
                              </span>) : (<span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                                🟢 Unpacked Ready
                              </span>)}
                          </td>

                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {canDelete ? (<button type="button" onClick={() => handleDeleteArrival(arr.id)} className="rounded-lg bg-red-500/10 border border-red-500/30 px-2.5 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20">
                                Delete
                              </button>) : (<span className="rounded-lg bg-zinc-800 px-2 py-1 text-[10px] font-medium text-zinc-500">
                                In Use
                              </span>)}
                          </td>
                        </tr>);
                })}
                  </tbody>
                </table>)}
            </div>) : (<div className="overflow-x-auto">
              {adjustments.filter((a) => a.quantity < 0).length === 0 ? (<div className="py-12 text-center text-zinc-500 text-sm">
                  No scrap or wastage losses recorded.
                </div>) : (<table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Scrap / Loss Quantity</th>
                      <th className="px-4 py-3">Reason / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {adjustments
                    .filter((a) => a.quantity < 0)
                    .map((adj) => (<tr key={adj.id} className="hover:bg-zinc-800/40">
                          <td className="px-4 py-3 text-zinc-400 font-mono">
                            {new Date(adj.createdAt).toLocaleDateString("en-IN")}
                          </td>
                          <td className="px-4 py-3 font-bold text-white">{adj.product.name}</td>
                          <td className="px-4 py-3 font-bold text-red-400">
                            {Math.abs(adj.quantity)} {adj.product.unit} Loss
                          </td>
                          <td className="px-4 py-3 text-zinc-300">{adj.reason}</td>
                        </tr>))}
                  </tbody>
                </table>)}
            </div>)}
        </div>
      </main>

      {/* ── LOG ARRIVAL MODAL ───────────────────────────────────────────────── */}
      {showArrivalModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>🚚</span> Log Incoming Truck Stock
              </h3>
              <button type="button" onClick={() => setShowArrivalModal(false)} className="text-zinc-400 hover:text-white p-2 min-h-[36px] min-w-[36px] flex items-center justify-center">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddArrival} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Product / Commodity
                </label>
                <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-amber-500 min-h-[44px]">
                  {products.map((p) => (<option key={p.id} value={p.id}>
                      {p.name} (Current Unpacked: {p.unpackedStock} {p.unit})
                    </option>))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Supplier / Vendor Name
                </label>
                <input required type="text" placeholder="e.g. Vijayawada Grain Suppliers" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-amber-500 min-h-[44px]"/>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Total Weight (kg)
                  </label>
                  <input required type="number" min="0.1" step="any" placeholder="e.g. 1000" value={totalWeight} onChange={(e) => setTotalWeight(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-amber-500 min-h-[44px]"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Cost per kg (₹)
                  </label>
                  <input required type="number" min="0" step="any" placeholder="e.g. 40" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-amber-500 min-h-[44px]"/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Vehicle / Truck Number
                </label>
                <input type="text" placeholder="e.g. AP 16 TJ 9821" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-amber-500 min-h-[44px]"/>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Note / Delivery Instructions
                </label>
                <textarea placeholder="Quality check, moisture note, etc." value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-amber-500"/>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowArrivalModal(false)} className="w-1/2 rounded-xl border border-zinc-700 bg-zinc-800 py-3 text-xs font-semibold text-zinc-400 hover:bg-zinc-700 min-h-[44px]">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="w-1/2 rounded-xl bg-amber-500 py-3 text-xs font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 min-h-[44px]">
                  {submitting ? "Saving..." : "Save Stock Arrival"}
                </button>
              </div>
            </form>
          </div>
        </div>)}

      {/* ── LOG SCRAP / SPILL MODAL ─────────────────────────────────────────── */}
      {showScrapModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>♻️</span> Log Scrap / Spill Wastage
              </h3>
              <button type="button" onClick={() => setShowScrapModal(false)} className="text-zinc-400 hover:text-white p-2 min-h-[36px] min-w-[36px] flex items-center justify-center">
                ✕
              </button>
            </div>

            <form onSubmit={handleLogScrap} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Product
                </label>
                <select value={scrapProductId} onChange={(e) => setScrapProductId(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-amber-500 min-h-[44px]">
                  {products.map((p) => (<option key={p.id} value={p.id}>
                      {p.name} (Unpacked: {p.unpackedStock} {p.unit})
                    </option>))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Scrap Loss Weight (kg)
                </label>
                <input required type="number" min="0.1" step="any" placeholder="e.g. 15" value={scrapWeight} onChange={(e) => setScrapWeight(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-amber-500 min-h-[44px]"/>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Scrap Reason
                </label>
                <input type="text" placeholder="e.g. Unloading spill, bag burst, moisture damage" value={scrapReason} onChange={(e) => setScrapReason(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-base sm:text-sm text-white outline-none focus:border-amber-500 min-h-[44px]"/>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowScrapModal(false)} className="w-1/2 rounded-xl border border-zinc-700 bg-zinc-800 py-3 text-xs font-semibold text-zinc-400 hover:bg-zinc-700 min-h-[44px]">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="w-1/2 rounded-xl bg-red-500 py-3 text-xs font-bold text-white hover:bg-red-400 disabled:opacity-50 min-h-[44px]">
                  {submitting ? "Logging..." : "Record Scrap Loss"}
                </button>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
}
