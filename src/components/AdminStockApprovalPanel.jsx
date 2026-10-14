"use client";
import { useCallback, useState, useEffect } from "react";
export function AdminStockApprovalPanel() {
    const [additions, setAdditions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [adminNote, setAdminNote] = useState("");
    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/stock-additions?status=PENDING", {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setAdditions(data.additions);
            }
        }
        catch (err) {
            console.error("Failed to load additions:", err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        load();
        const interval = setInterval(load, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [load]);
    async function handleAction(id, status) {
        setProcessingId(id);
        try {
            const res = await fetch("/api/stock-additions", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    status,
                    adminNote: adminNote || undefined,
                }),
            });
            if (res.ok) {
                setAdminNote("");
                setSelectedId(null);
                await load();
            }
            else {
                alert("Failed to process stock addition");
            }
        }
        catch (err) {
            alert("Error processing request");
        }
        finally {
            setProcessingId(null);
        }
    }
    if (loading)
        return <p className="text-zinc-500">Loading...</p>;
    if (additions.length === 0) {
        return (<div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-semibold text-green-700">✅ No pending stock additions</p>
      </div>);
    }
    return (<div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-800">
        📋 Stock Addition Approvals ({additions.length})
      </h2>

      <div className="space-y-3">
        {additions.map((addition) => (<div key={addition.id} className="rounded-lg border border-zinc-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-zinc-900">{addition.product.name}</h3>
                  <span className="text-xs font-medium text-zinc-500">
                    ({addition.bagCount} bags × {addition.bagWeight} {addition.product.unit})
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-600">
                  Submitted by: <span className="font-medium">{addition.worker.name}</span>
                  {addition.worker.phone && (<>
                      {" "}
                      · <span className="text-xs">{addition.worker.phone}</span>
                    </>)}
                </p>
                <p className="text-xs text-zinc-500">
                  Total Weight: <span className="font-semibold">{addition.totalWeight}</span> {addition.product.unit}
                </p>
                {addition.note && (<p className="mt-2 rounded-lg bg-blue-50 p-2 text-sm text-blue-900">
                    <span className="font-medium">Note:</span> {addition.note}
                  </p>)}

                {selectedId === addition.id && (<div className="mt-3 space-y-2">
                    <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Add optional admin note..." className="w-full rounded-lg border border-zinc-300 p-2 text-sm focus:border-blue-500 focus:outline-none" rows={2}/>
                  </div>)}
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button type="button" disabled={processingId === addition.id} onClick={() => {
                if (selectedId === addition.id) {
                    handleAction(addition.id, "APPROVED");
                }
                else {
                    setSelectedId(addition.id);
                }
            }} className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                ✅ {selectedId === addition.id ? "Confirm Approve" : "Approve"}
              </button>
              <button type="button" disabled={processingId === addition.id} onClick={() => {
                if (selectedId === addition.id) {
                    handleAction(addition.id, "REJECTED");
                }
                else {
                    setSelectedId(addition.id);
                    setAdminNote("");
                }
            }} className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                ❌ {selectedId === addition.id ? "Confirm Reject" : "Reject"}
              </button>
              {selectedId === addition.id && (<button type="button" onClick={() => {
                    setSelectedId(null);
                    setAdminNote("");
                }} className="rounded-lg bg-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-300">
                  Cancel
                </button>)}
            </div>
          </div>))}
      </div>
    </div>);
}
