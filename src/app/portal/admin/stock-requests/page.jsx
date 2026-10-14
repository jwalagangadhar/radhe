"use client";
import { useCallback, useEffect, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
export default function AdminStockRequestsPage() {
    const [user, setUser] = useState(null);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("PENDING");
    const [channelFilter, setChannelFilter] = useState("ALL");
    const [processingId, setProcessingId] = useState(null);
    const [adminNotes, setAdminNotes] = useState({});
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const loadData = useCallback(async () => {
        try {
            const meRes = await fetch("/api/auth/me", { credentials: "include" });
            const me = await meRes.json();
            if (!me.user || me.user.role !== "ADMIN") {
                window.location.href = "/portal/login";
                return;
            }
            setUser(me.user);
            const url = filter === "ALL" ? "/api/stock-requests" : `/api/stock-requests?status=${filter}`;
            const res = await fetch(url, { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests ?? []);
            }
        }
        catch (err) {
            console.error("Failed to load stock requests:", err);
        }
        finally {
            setLoading(false);
        }
    }, [filter]);
    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 15000);
        return () => clearInterval(interval);
    }, [loadData]);
    async function handleReview(id, status) {
        setProcessingId(id);
        setErrorMsg("");
        setSuccessMsg("");
        try {
            const res = await fetch("/api/stock-requests", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    status,
                    adminNote: adminNotes[id] || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMsg(status === "APPROVED"
                    ? "✅ Stock request approved! Packed stock updated."
                    : "❌ Stock request rejected. Unpacked stock restored.");
                await loadData();
                setTimeout(() => setSuccessMsg(""), 4000);
            }
            else {
                setErrorMsg(data.error ?? "Failed to process request");
            }
        }
        catch {
            setErrorMsg("Something went wrong while processing request");
        }
        finally {
            setProcessingId(null);
        }
    }
    if (!user) {
        return <p className="p-8 text-center text-zinc-500">Loading stock requests...</p>;
    }
    const pendingCount = requests.filter((r) => r.status === "PENDING").length;
    // Filter by channel if selected
    const filteredRequests = requests.filter((req) => {
        if (channelFilter === "ALL")
            return true;
        const tagMatch = req.note?.match(/\[(NON_GST|GST|WEB):?([^\]]*)\]/);
        if (!tagMatch)
            return channelFilter === "GST"; // default fallback
        return tagMatch[1] === channelFilter;
    });
    const nonGstPending = requests.filter((r) => r.status === "PENDING" && r.note?.includes("[NON_GST")).length;
    const gstPending = requests.filter((r) => r.status === "PENDING" && (r.note?.includes("[GST") || (!r.note?.includes("[NON_GST") && !r.note?.includes("[WEB")))).length;
    const webPending = requests.filter((r) => r.status === "PENDING" && r.note?.includes("[WEB")).length;
    return (<div className="min-h-screen bg-zinc-50">
      <PortalNav role="ADMIN" userName={user.name}/>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">Worker Stock Packing Requests</h1>
            <p className="mt-1 text-xs sm:text-sm text-zinc-500">
              Review and approve worker requests to convert raw stock from supplier arrivals into retail 1kg packages or wholesale bags.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/portal/admin/arrivals" className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition shadow-sm min-h-[38px]">
              🚚 Supplier Arrivals Hub →
            </a>
            {pendingCount > 0 && (<span className="rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-bold text-amber-800">
                ⚠️ {pendingCount} Pending Review
              </span>)}
          </div>
        </div>

        {/* Channel Summary Cards */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button type="button" onClick={() => setChannelFilter(channelFilter === "NON_GST" ? "ALL" : "NON_GST")} className={`rounded-xl border p-3.5 text-left transition-all ${channelFilter === "NON_GST"
            ? "border-emerald-500 bg-emerald-50/80 shadow-sm"
            : "border-zinc-200 bg-white hover:border-zinc-300"}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">💵 Non-GST Retail</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                {nonGstPending} Pending
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-zinc-900">1 kg & Retail Packages</p>
            <p className="text-[11px] text-zinc-500">For retail counter billing & pack conversions</p>
          </button>

          <button type="button" onClick={() => setChannelFilter(channelFilter === "GST" ? "ALL" : "GST")} className={`rounded-xl border p-3.5 text-left transition-all ${channelFilter === "GST"
            ? "border-blue-500 bg-blue-50/80 shadow-sm"
            : "border-zinc-200 bg-white hover:border-zinc-300"}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">🧾 GST Wholesale</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-800">
                {gstPending} Pending
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-zinc-900">Wholesale Bags (30kg / 50kg)</p>
            <p className="text-[11px] text-zinc-500">B2B wholesale orders & GST counter sales</p>
          </button>

          <button type="button" onClick={() => setChannelFilter(channelFilter === "WEB" ? "ALL" : "WEB")} className={`rounded-xl border p-3.5 text-left transition-all ${channelFilter === "WEB"
            ? "border-purple-500 bg-purple-50/80 shadow-sm"
            : "border-zinc-200 bg-white hover:border-zinc-300"}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700">🌐 Web Storefront</span>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-800">
                {webPending} Pending
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-zinc-900">E-Commerce & Online Bags</p>
            <p className="text-[11px] text-zinc-500">Direct-to-consumer online store inventory</p>
          </button>
        </div>

        {/* Global Feedback Banners */}
        {successMsg && (<div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800 shadow-sm">
            {successMsg}
          </div>)}
        {errorMsg && (<div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 shadow-sm">
            {errorMsg}
          </div>)}

        {/* Status Filter Tabs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {["ALL", "PENDING", "APPROVED", "REJECTED"].map((tab) => (<button key={tab} type="button" onClick={() => setFilter(tab)} className={`rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all min-h-[38px] ${filter === tab
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100"}`}>
                {tab === "ALL" ? "All Statuses" : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>))}
          </div>

          {channelFilter !== "ALL" && (<button type="button" onClick={() => setChannelFilter("ALL")} className="text-xs text-blue-600 hover:underline font-semibold min-h-[38px] flex items-center">
              Clear Channel Filter ({channelFilter})
            </button>)}
        </div>

        {/* List of Requests */}
        {loading ? (<div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
            Loading...
          </div>) : filteredRequests.length === 0 ? (<div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
            No stock packing requests found.
          </div>) : (<div className="grid gap-4 md:grid-cols-2">
            {filteredRequests.map((req) => {
                const tagMatch = req.note?.match(/\[(NON_GST|GST|WEB):?([^\]]*)\]/);
                const cleanNote = req.note?.replace(/\[(NON_GST|GST|WEB):?[^\]]*\]\s*/, "");
                const isNonGst = tagMatch ? tagMatch[1] === "NON_GST" : false;
                const isWeb = tagMatch ? tagMatch[1] === "WEB" : false;
                const packType = tagMatch ? tagMatch[2] : "";
                return (<div key={req.id} className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${isNonGst
                        ? "border-emerald-200 ring-1 ring-emerald-100"
                        : isWeb
                            ? "border-purple-200 ring-1 ring-purple-100"
                            : "border-zinc-200"}`}>
                  <div>
                    {/* Header with Channel Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${isNonGst
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : isWeb
                            ? "bg-purple-100 text-purple-800 border border-purple-300"
                            : "bg-blue-100 text-blue-800 border border-blue-300"}`}>
                            {isNonGst && "💵 Non-GST Retail"}
                            {isWeb && "🌐 Web Storefront"}
                            {!isNonGst && !isWeb && "🧾 GST Wholesale"}
                            {packType && <span className="opacity-75">· {packType}</span>}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-zinc-900">{req.product.name}</h3>
                        <p className="text-xs text-zinc-500">
                          Requested by: <span className="font-semibold text-zinc-700">{req.worker.name}</span>
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${req.status === "PENDING"
                        ? "bg-amber-100 text-amber-800"
                        : req.status === "APPROVED"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"}`}>
                        {req.status}
                      </span>
                    </div>

                    {/* Quantity & Weight Breakdown */}
                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-zinc-50 p-3 text-sm">
                      <div>
                        <span className="text-xs font-medium text-zinc-400 block">
                          {isNonGst ? "Packages" : "Bag Details"}
                        </span>
                        <span className="font-semibold text-zinc-800">
                          {req.bagCount} {isNonGst ? "packs" : "bags"} × {req.bagWeight} {req.product.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-zinc-400 block">Total Packed Weight</span>
                        <span className="font-bold text-blue-600">
                          {req.totalWeight} {req.product.unit}
                        </span>
                      </div>
                    </div>

                    {/* Raw stock availability info */}
                    {req.product.unpackedStock !== undefined && (<div className="mt-2 flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-1.5 text-xs">
                        <span className="text-zinc-500">Available Unpacked Raw Stock:</span>
                        <span className={`font-bold ${(req.product.unpackedStock ?? 0) >= req.totalWeight
                            ? "text-emerald-700"
                            : "text-amber-700"}`}>
                          {req.product.unpackedStock ?? 0} {req.product.unit}
                        </span>
                      </div>)}

                    {cleanNote && (<div className="mt-3 rounded-lg bg-blue-50/60 p-2.5 text-xs text-blue-900">
                        <span className="font-bold">Worker Note:</span> {cleanNote}
                      </div>)}

                    {req.adminNote && (<div className="mt-2 rounded-lg bg-zinc-100 p-2.5 text-xs text-zinc-700">
                        <span className="font-bold">Admin Note:</span> {req.adminNote}
                      </div>)}

                    <p className="mt-3 text-[11px] text-zinc-400">
                      Submitted: {new Date(req.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>

                  {req.status === "PENDING" && (<div className="mt-4 border-t border-zinc-100 pt-4">
                      <input type="text" placeholder="Optional admin note..." value={adminNotes[req.id] || ""} onChange={(e) => setAdminNotes({ ...adminNotes, [req.id]: e.target.value })} className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-xs focus:border-blue-500 focus:outline-none min-h-[38px]"/>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button type="button" disabled={processingId === req.id} onClick={() => handleReview(req.id, "APPROVED")} className="flex-1 rounded-lg bg-green-600 py-2.5 px-3 text-xs font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-50 min-h-[42px] flex items-center justify-center">
                          {processingId === req.id ? "Processing..." : "✅ Approve & Update Stock"}
                        </button>
                        <button type="button" disabled={processingId === req.id} onClick={() => handleReview(req.id, "REJECTED")} className="flex-1 rounded-lg bg-red-600 py-2.5 px-3 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50 min-h-[42px] flex items-center justify-center">
                          {processingId === req.id ? "Processing..." : "❌ Reject"}
                        </button>
                      </div>
                    </div>)}
                </div>);
            })}
          </div>)}
      </div>
    </div>);
}
