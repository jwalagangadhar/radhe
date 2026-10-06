"use client";

import { useState } from "react";

export function ComplianceExporter() {
  const [activeTab, setActiveTab] = useState<"gstr1" | "gstr3b" | "ewaybill" | "einvoice">("gstr1");
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchPayload = async (tab: "gstr1" | "gstr3b" | "ewaybill" | "einvoice") => {
    setActiveTab(tab);
    setLoading(true);
    try {
      const res = await fetch(`/api/erp/compliance?type=${tab}`);
      const data = await res.json();
      setPayload(data.payload);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJson = () => {
    if (!payload) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `${activeTab.toUpperCase()}_EXPORT_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900">GST & E-Way Bill Compliance Hub</h2>
          <p className="text-xs text-zinc-500">Auto-generated GSTR-1, GSTR-3B summary, and NIC E-Way Bill / E-Invoice JSON payloads.</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => fetchPayload("gstr1")}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition min-h-[38px] flex items-center justify-center flex-1 sm:flex-none ${
              activeTab === "gstr1" ? "bg-amber-500 text-zinc-950 shadow-xs" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            📊 GSTR-1 Payload
          </button>
          <button
            onClick={() => fetchPayload("gstr3b")}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition min-h-[38px] flex items-center justify-center flex-1 sm:flex-none ${
              activeTab === "gstr3b" ? "bg-amber-500 text-zinc-950 shadow-xs" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            📋 GSTR-3B Summary
          </button>
          <button
            onClick={() => fetchPayload("ewaybill")}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition min-h-[38px] flex items-center justify-center flex-1 sm:flex-none ${
              activeTab === "ewaybill" ? "bg-amber-500 text-zinc-950 shadow-xs" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            🚚 E-Way Bill JSON
          </button>
          <button
            onClick={() => fetchPayload("einvoice")}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition min-h-[38px] flex items-center justify-center flex-1 sm:flex-none ${
              activeTab === "einvoice" ? "bg-amber-500 text-zinc-950 shadow-xs" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            🧾 E-Invoice (IRN)
          </button>
        </div>
      </div>

      {/* JSON Viewer & Download Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-900 px-4 py-2.5 rounded-t-xl text-xs text-zinc-300">
        <span className="font-mono text-amber-400 font-bold uppercase">{activeTab} JSON Schema Preview</span>
        <button
          onClick={handleDownloadJson}
          disabled={!payload}
          className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition min-h-[36px] self-start sm:self-auto"
        >
          ⬇️ Download Official JSON File
        </button>
      </div>

      <div className="rounded-b-xl border border-zinc-900 bg-zinc-950 p-4 font-mono text-xs text-emerald-400 max-h-96 overflow-y-auto">
        {loading ? (
          <p className="text-zinc-500">Generating compliance payload schema...</p>
        ) : payload ? (
          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(payload, null, 2)}</pre>
        ) : (
          <p className="text-zinc-500">Click on any compliance tab above to generate payload JSON.</p>
        )}
      </div>
    </div>
  );
}
