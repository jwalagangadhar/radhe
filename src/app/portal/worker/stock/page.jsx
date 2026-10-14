"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
import { formatQuantity } from "@/lib/types";
export default function WorkerStockRequestsPage() {
    const [user, setUser] = useState(null);
    const [products, setProducts] = useState([]);
    const [requests, setRequests] = useState([]);
    const [arrivals, setArrivals] = useState([]);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [sendingChat, setSendingChat] = useState(false);
    // Form states
    const [selectedProductId, setSelectedProductId] = useState("");
    const [channel, setChannel] = useState("NON_GST");
    const [packageType, setPackageType] = useState("1kg_pack");
    const [bagCount, setBagCount] = useState(20);
    const [customBagWeight, setCustomBagWeight] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    // Track whether we have initialized form defaults from the first fetch
    const formInitialized = useRef(false);
    const load = useCallback(async () => {
        try {
            const meRes = await fetch("/api/auth/me", { credentials: "include" });
            const me = await meRes.json();
            if (!me.user) {
                window.location.href = "/portal/login";
                return;
            }
            setUser(me.user);
            const [prodRes, reqRes, msgRes, arrRes] = await Promise.all([
                fetch("/api/products?active=true", { credentials: "include" }),
                fetch("/api/stock-requests", { credentials: "include" }),
                fetch("/api/messages", { credentials: "include" }),
                fetch("/api/stock-arrivals", { credentials: "include" }),
            ]);
            if (prodRes.ok) {
                const prodData = await prodRes.json();
                const fetchedProducts = prodData.products ?? [];
                setProducts(fetchedProducts);
                if (!formInitialized.current && fetchedProducts.length > 0) {
                    formInitialized.current = true;
                    const first = fetchedProducts[0];
                    setSelectedProductId(first.id);
                    setBagCount(20);
                }
            }
            if (reqRes.ok) {
                const reqData = await reqRes.json();
                setRequests(reqData.requests ?? []);
            }
            if (msgRes.ok) {
                const msgData = await msgRes.json();
                setMessages(msgData.messages ?? []);
            }
            if (arrRes.ok) {
                const arrData = await arrRes.json();
                setArrivals(arrData.arrivals ?? []);
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            // Background load complete
        }
    }, []);
    function getEffectiveWeight() {
        if (channel === "NON_GST") {
            if (packageType === "1kg_pack")
                return 1.0;
            if (packageType === "500g_pack")
                return 0.5;
            if (packageType === "250g_pack")
                return 0.25;
            if (packageType === "5kg_pack")
                return 5.0;
            if (packageType === "wholesale_bag")
                return customBagWeight !== "" ? Number(customBagWeight) : (selectedProduct?.bagWeight ?? 30);
            return Number(customBagWeight) || 1.0;
        }
        // GST or WEB
        return customBagWeight !== "" ? Number(customBagWeight) : (selectedProduct?.bagWeight ?? 30);
    }
    // Update defaults when product changes
    function handleProductChange(prodId) {
        setSelectedProductId(prodId);
        const prod = products.find((p) => p.id === prodId);
        if (prod) {
            if (channel === "NON_GST") {
                setBagCount(25);
            }
            else {
                setBagCount(prod.minBulkBags || 1);
            }
            setCustomBagWeight("");
        }
        setErrorMessage("");
    }
    function handleSelectArrivalForPacking(arrival) {
        setSelectedProductId(arrival.productId);
        setChannel("NON_GST");
        setPackageType("1kg_pack");
        setBagCount(25);
        setNote(`Packing raw arrival from ${arrival.supplierName} (${arrival.vehicleNumber || "Truck"})`);
        setErrorMessage("");
        window.scrollTo({ top: 380, behavior: "smooth" });
    }
    async function handleCreateRequest(e) {
        e.preventDefault();
        setErrorMessage("");
        const product = products.find((p) => p.id === selectedProductId);
        if (!product)
            return;
        const effectiveWeight = getEffectiveWeight();
        const isRetailNonGst = channel === "NON_GST" && effectiveWeight <= 5;
        // Wholesale limits apply only to wholesale bags
        if (!isRetailNonGst) {
            if (bagCount < product.minBulkBags) {
                setErrorMessage(`Error: Min limit is ${product.minBulkBags} bags for ${product.name}`);
                return;
            }
            if (bagCount > product.maxBulkBags) {
                setErrorMessage(`Error: Max limit is ${product.maxBulkBags} bags for ${product.name}`);
                return;
            }
        }
        const totalWeight = bagCount * effectiveWeight;
        if (product.stock + totalWeight > product.maxStock) {
            setErrorMessage(`Error: Exceeds maximum allowed product stock limit of ${product.maxStock} ${product.unit}`);
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch("/api/stock-requests", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: selectedProductId,
                    bagCount,
                    bagWeight: effectiveWeight,
                    channel,
                    packageType,
                    note,
                }),
            });
            if (res.ok) {
                setNote("");
                await load();
            }
            else {
                const data = await res.json();
                setErrorMessage(data.error ?? "Failed to submit request");
            }
        }
        catch {
            setErrorMessage("Something went wrong");
        }
        finally {
            setSubmitting(false);
        }
    }
    async function handleSendChat(e) {
        e.preventDefault();
        if (!chatInput.trim() || sendingChat)
            return;
        setSendingChat(true);
        try {
            const res = await fetch("/api/messages", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: chatInput }),
            });
            if (res.ok) {
                setChatInput("");
                const msgRes = await fetch("/api/messages", { credentials: "include" });
                if (msgRes.ok) {
                    const msgData = await msgRes.json();
                    setMessages(msgData.messages ?? []);
                }
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setSendingChat(false);
        }
    }
    useEffect(() => {
        const initialLoad = window.setTimeout(load, 0);
        const interval = window.setInterval(load, 15000);
        return () => {
            window.clearTimeout(initialLoad);
            window.clearInterval(interval);
        };
    }, [load]);
    if (!user)
        return <p className="p-8 text-center">Loading...</p>;
    const selectedProduct = products.find((p) => p.id === selectedProductId);
    const bagWeight = getEffectiveWeight();
    const calculatedTotal = bagCount * bagWeight;
    const selectedProductExt = selectedProduct;
    const parentProduct = selectedProductExt?.parentId
        ? products.find((p) => p.id === selectedProductExt.parentId)
        : null;
    const availableUnpackedStock = parentProduct
        ? (parentProduct.unpackedStock ?? 0)
        : (selectedProduct?.unpackedStock ?? 0);
    return (<div className="min-h-screen bg-zinc-50">
      <PortalNav role={user.role === "ADMIN" ? "ADMIN" : "WORKER"} userName={user.name}/>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">Replenishment &amp; Stock Levels</h1>

        {/* ============================================================
            SECTION 1.5 — 🚚 INBOUND RAW STOCK RECEIVED FROM SUPPLIERS
        ============================================================ */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <span>🚚</span> Inbound Raw Stock Received from Suppliers (Seller Arrivals)
              </h2>
              <p className="text-xs text-zinc-500">
                Incoming raw truck deliveries logged by Admin Edwin. Click to quickly pack from newly arrived raw material.
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold">
              {arrivals.filter((a) => a.totalWeight - a.usedWeight > 0).length} Shipments Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {arrivals
            .filter((a) => a.totalWeight - a.usedWeight > 0)
            .slice(0, 6)
            .map((arr) => {
            const remainingKg = arr.totalWeight - arr.usedWeight;
            return (<div key={arr.id} className="rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-amber-50/20 p-3.5 flex flex-col justify-between hover:border-amber-400 transition shadow-xs">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <p className="font-extrabold text-zinc-900 text-sm">{arr.product?.name || "Commodity"}</p>
                          <p className="text-xs font-semibold text-zinc-600">From: {arr.supplierName}</p>
                        </div>
                        <span className="rounded bg-zinc-900 text-amber-400 px-2 py-0.5 text-[10px] font-mono font-bold">
                          {arr.vehicleNumber ? `🚛 ${arr.vehicleNumber}` : "Arrived"}
                        </span>
                      </div>
                      <div className="mt-2 text-xs flex justify-between text-zinc-500">
                        <span>Arrived: {new Date(arr.createdAt).toLocaleDateString("en-IN")}</span>
                        <span className="font-bold text-emerald-700">{remainingKg} kg raw left</span>
                      </div>
                    </div>

                    <button type="button" onClick={() => handleSelectArrivalForPacking(arr)} className="mt-3 w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold py-1.5 text-xs transition active:scale-95 shadow-xs flex items-center justify-center gap-1.5">
                      <span>⚡ Pack from this Arrival</span>
                    </button>
                  </div>);
        })}
            {arrivals.filter((a) => a.totalWeight - a.usedWeight > 0).length === 0 && (<div className="col-span-3 py-6 text-center text-xs text-zinc-400">
                No active raw arrivals awaiting packing. All shipments are fully processed or logged.
              </div>)}
          </div>
        </div>

        {/* ============================================================
            SECTION 2 — CURRENT STOCK LEVELS + REQUEST FORM
        ============================================================ */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Active Stock Levels */}
          <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-800 mb-4">Current Warehouse Stock</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {products.map((p) => (<div key={p.id} className={`rounded-lg border p-4 ${p.stock <= p.minStock
                ? "border-red-200 bg-red-50/30"
                : "border-zinc-200 bg-white"}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-zinc-900 text-base">{p.name}</p>
                      {p.parentId && (<p className="text-xs text-blue-600 mt-0.5">📦 Variant · {(products.find(pp => pp.id === p.parentId))?.name ?? ""}</p>)}
                    </div>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-650 uppercase">
                      1 Bag = {p.bagWeight ?? 25} {p.unit}
                    </span>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3">
                    {/* Packed Stock */}
                    <div className="border-r border-zinc-100 pr-2">
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Packed (Storefront)</p>
                      <p className={`text-lg font-black mt-1 ${p.stock <= p.minStock ? "text-red-650" : "text-zinc-800"}`}>
                        {formatQuantity(p.stock, p.unit)}
                      </p>
                      <p className="text-[10px] text-zinc-400">Min Alert: {p.minStock}</p>
                    </div>

                    {/* Unpacked Stock */}
                    <div className="pl-2">
                      <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Unpacked (Raw Bulk)</p>
                      <p className="text-lg font-black mt-1 text-emerald-700">
                        {formatQuantity(p.unpackedStock ?? 0, p.unit)}
                      </p>
                      <p className="text-[10px] text-zinc-400">Ready to pack</p>
                    </div>
                  </div>

                  {/* Stock progress indicators */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[9px] text-zinc-400">
                      <span>Packed Stock Fill Level</span>
                      <span>{Math.round(Math.min(100, (p.stock / p.maxStock) * 100))}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${p.stock <= p.minStock ? "bg-red-500" : "bg-blue-600"}`} style={{ width: `${Math.min(100, (p.stock / p.maxStock) * 100)}%` }}/>
                    </div>
                  </div>
                </div>))}
            </div>
          </div>

          {/* Request Replenishment Form */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-800 mb-1">Request Packing / Replenish</h2>
            <p className="text-xs text-zinc-500 mb-4">Select channel and pack raw stock into Non-GST retail or GST wholesale.</p>
            <form onSubmit={handleCreateRequest} className="space-y-3">
              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Target Sales Channel</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-zinc-100">
                  <button type="button" onClick={() => {
            setChannel("NON_GST");
            setPackageType("1kg_pack");
            setBagCount(25);
        }} className={`rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1 min-h-[38px] ${channel === "NON_GST"
            ? "bg-orange-500 text-white shadow-sm"
            : "text-zinc-600 hover:bg-zinc-200"}`}>
                    <span>💵 Non-GST</span>
                    <span className="text-[10px] opacity-80">(1kg)</span>
                  </button>
                  <button type="button" onClick={() => {
            setChannel("GST");
            setPackageType("wholesale_bag");
            setBagCount(selectedProduct?.minBulkBags || 5);
        }} className={`rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1 min-h-[38px] ${channel === "GST"
            ? "bg-amber-600 text-white shadow-sm"
            : "text-zinc-600 hover:bg-zinc-200"}`}>
                    <span>🧾 GST</span>
                    <span className="text-[10px] opacity-80">(Bags)</span>
                  </button>
                  <button type="button" onClick={() => {
            setChannel("WEB");
            setPackageType("wholesale_bag");
            setBagCount(selectedProduct?.minBulkBags || 5);
        }} className={`rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1 min-h-[38px] ${channel === "WEB"
            ? "bg-indigo-600 text-white shadow-sm"
            : "text-zinc-600 hover:bg-zinc-200"}`}>
                    <span>🌐 Web</span>
                    <span className="text-[10px] opacity-80">(Store)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Select Product</label>
                <select value={selectedProductId} onChange={(e) => handleProductChange(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-sm focus:outline-none min-h-[42px]">
                  {products.map((p) => (<option key={p.id} value={p.id}>
                      {p.name}{p.parentId ? " (Variant)" : ""}
                    </option>))}
                </select>
              </div>

              {/* Non-GST Retail Pack Size Chips */}
              {channel === "NON_GST" && (<div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-500">Select Non-GST Pack Size</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                { id: "1kg_pack", label: "1 kg Pack (Standard)", weight: 1.0 },
                { id: "500g_pack", label: "½ kg (500g)", weight: 0.5 },
                { id: "250g_pack", label: "¼ kg (250g)", weight: 0.25 },
                { id: "5kg_pack", label: "5 kg Pack", weight: 5.0 },
                { id: "wholesale_bag", label: `🎒 1 Bag (${selectedProduct?.bagWeight || 30}kg)`, weight: selectedProduct?.bagWeight || 30 },
            ].map((opt) => (<button key={opt.id} type="button" onClick={() => setPackageType(opt.id)} className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition min-h-[36px] flex items-center justify-center ${packageType === opt.id
                    ? "bg-orange-600 text-white shadow-xs"
                    : "bg-orange-50 text-orange-900 border border-orange-200 hover:bg-orange-100"}`}>
                        {opt.label}
                      </button>))}
                  </div>
                </div>)}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">
                    {channel === "NON_GST" && packageType !== "wholesale_bag"
            ? `Packets Count (${packageType === "1kg_pack" ? "1kg" : packageType.replace("_pack", "")})`
            : "Number of Bags"}
                  </label>
                  <input required type="number" min="1" value={bagCount || ""} onChange={(e) => setBagCount(parseInt(e.target.value) || 0)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-sm focus:outline-none min-h-[42px]"/>
                  {selectedProduct && (<span className="text-[10px] text-zinc-400">
                      {channel === "NON_GST" && packageType !== "wholesale_bag"
                ? "Retail packing: Min 1 packet"
                : `Wholesale Limit: ${selectedProduct.minBulkBags}-${selectedProduct.maxBulkBags} bags`}
                    </span>)}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">
                    {channel === "NON_GST" && packageType !== "wholesale_bag" ? "Pack Size Weight" : "Weight per Bag"}
                  </label>
                  {channel === "NON_GST" && packageType !== "wholesale_bag" ? (<div className="w-full rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-900 min-h-[42px] flex items-center">
                      {bagWeight} kg / packet
                    </div>) : (<select value={customBagWeight !== "" ? customBagWeight : (selectedProduct?.bagWeight ?? 30)} onChange={(e) => setCustomBagWeight(parseFloat(e.target.value))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-sm focus:outline-none min-h-[42px]">
                      <option value={30}>30 kg</option>
                      <option value={50}>50 kg</option>
                    </select>)}
                </div>
              </div>

              <div className="rounded-lg bg-zinc-50 p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Unpacked raw stock available:</span>
                  <span className="font-bold text-emerald-700">
                    {availableUnpackedStock.toFixed(2)} kg
                    {parentProduct ? ` (from ${parentProduct.name ?? "parent"})` : ""}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-200 pt-2 text-sm">
                  <span className="text-zinc-650 font-medium">Total weight to pack:</span>
                  <span className={`font-bold ${selectedProduct && calculatedTotal > availableUnpackedStock ? "text-red-600" : "text-amber-700"}`}>
                    {calculatedTotal.toFixed(1)} kg
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Note (Optional)</label>
                <textarea placeholder="e.g. Packing 1kg retail packs for counter sale" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none"/>
              </div>

              {errorMessage && (<p className="rounded bg-red-50 p-2 text-xs font-medium text-red-600">{errorMessage}</p>)}

              <button type="submit" disabled={submitting || calculatedTotal === 0} className="w-full rounded-lg bg-amber-600 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors text-sm">
                {submitting ? "Submitting..." : "📤 Send Request to Admin"}
              </button>
            </form>
          </div>
        </div>

        {/* ============================================================
            SECTION 3 — CHAT + MY REQUESTS
        ============================================================ */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Chat with Admin Panel */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col h-[320px]">
            <h3 className="text-md font-semibold text-zinc-800 mb-2">Message Admin</h3>
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 p-2 bg-zinc-50 rounded-lg">
              {messages.length === 0 ? (<p className="text-center text-xs text-zinc-400 py-8">No messages yet. Send a note below.</p>) : (messages.map((msg) => (<div key={msg.id} className="text-xs">
                    <span className={`font-bold ${msg.sender.role === "ADMIN" ? "text-amber-700" : "text-blue-600"}`}>
                      {msg.sender.name}:
                    </span>{" "}
                    <span className="text-zinc-800">{msg.body}</span>
                  </div>)))}
            </div>
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input required type="text" placeholder="Ask admin to approve requests..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="flex-1 rounded-lg border border-zinc-300 px-3 py-1 text-xs focus:outline-none"/>
              <button type="submit" disabled={sendingChat} className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                Send
              </button>
            </form>
          </div>

          {/* My Stock Requests List */}
          <div className="md:col-span-2 rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-sm overflow-hidden flex flex-col">
            <h3 className="text-base sm:text-lg font-semibold text-zinc-800 mb-3">My Replenishment Requests</h3>
            <div className="overflow-y-auto max-h-[300px]">
              {requests.length === 0 ? (<p className="text-center text-sm text-zinc-400 py-10">No stock requests submitted yet.</p>) : (<>
                  {/* Mobile Request Cards */}
                  <div className="space-y-2.5 block sm:hidden">
                    {requests.map((req) => {
                const tagMatch = req.note?.match(/\[(NON_GST|GST|WEB):?([^\]]*)\]/);
                const cleanNote = req.note?.replace(/\[(NON_GST|GST|WEB):?[^\]]*\]\s*/, "");
                return (<div key={req.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-2 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-zinc-900">{req.product.name}</p>
                              <p className="text-[10px] text-zinc-400">{new Date(req.createdAt).toLocaleDateString("en-IN")}</p>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${req.status === "APPROVED"
                        ? "bg-green-100 text-green-700"
                        : req.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"}`}>
                              {req.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] pt-1 border-t border-zinc-200">
                            <div>
                              {tagMatch ? (<span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${tagMatch[1] === "NON_GST"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : tagMatch[1] === "GST"
                                ? "bg-blue-100 text-blue-800 border border-blue-300"
                                : "bg-purple-100 text-purple-800 border border-purple-300"}`}>
                                  {tagMatch[1] === "NON_GST" && "💵 Non-GST"}
                                  {tagMatch[1] === "GST" && "🧾 GST"}
                                  {tagMatch[1] === "WEB" && "🌐 Web"}
                                  {tagMatch[2] && <span className="opacity-75">· {tagMatch[2]}</span>}
                                </span>) : (<span className="text-zinc-400 italic">General</span>)}
                            </div>
                            <div className="font-semibold text-zinc-700">
                              {req.bagCount} × {req.bagWeight} {req.product.unit} = <span className="font-bold text-zinc-900">{formatQuantity(req.totalWeight, req.product.unit)}</span>
                            </div>
                          </div>

                          {cleanNote && <div className="text-[10px] text-zinc-500 bg-white p-1.5 rounded border border-zinc-200">{cleanNote}</div>}
                        </div>);
            })}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead className="bg-zinc-50 font-semibold uppercase tracking-wide text-zinc-500">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Channel / Target</th>
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">Packs / Bags</th>
                          <th className="px-3 py-2">Total Weight</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {requests.map((req) => {
                const tagMatch = req.note?.match(/\[(NON_GST|GST|WEB):?([^\]]*)\]/);
                const cleanNote = req.note?.replace(/\[(NON_GST|GST|WEB):?[^\]]*\]\s*/, "");
                return (<tr key={req.id}>
                              <td className="px-3 py-2 text-zinc-500">
                                {new Date(req.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2">
                                {tagMatch ? (<span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${tagMatch[1] === "NON_GST"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : tagMatch[1] === "GST"
                                ? "bg-blue-100 text-blue-800 border border-blue-300"
                                : "bg-purple-100 text-purple-800 border border-purple-300"}`}>
                                    {tagMatch[1] === "NON_GST" && "💵 Non-GST"}
                                    {tagMatch[1] === "GST" && "🧾 GST"}
                                    {tagMatch[1] === "WEB" && "🌐 Web"}
                                    {tagMatch[2] && <span className="opacity-75">· {tagMatch[2]}</span>}
                                  </span>) : (<span className="text-zinc-400 italic">General</span>)}
                              </td>
                              <td className="px-3 py-2 font-semibold text-zinc-700">
                                {req.product.name}
                                {cleanNote && <div className="text-[10px] font-normal text-zinc-400">{cleanNote}</div>}
                              </td>
                              <td className="px-3 py-2">
                                {req.bagCount} × {req.bagWeight} {req.product.unit}
                              </td>
                              <td className="px-3 py-2 font-bold">
                                {formatQuantity(req.totalWeight, req.product.unit)}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${req.status === "APPROVED"
                        ? "bg-green-100 text-green-700"
                        : req.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"}`}>
                                  {req.status}
                                </span>
                              </td>
                            </tr>);
            })}
                      </tbody>
                    </table>
                  </div>
                </>)}
            </div>
          </div>
        </div>
      </div>
    </div>);
}
