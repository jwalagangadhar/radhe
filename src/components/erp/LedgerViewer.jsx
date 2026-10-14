"use client";
import { useState, useEffect } from "react";
export function LedgerViewer() {
    const [accounts, setAccounts] = useState([]);
    const [entries, setEntries] = useState([]);
    const [trialBalance, setTrialBalance] = useState({
        totalDebit: 0,
        totalCredit: 0,
        isBalanced: true,
    });
    const [loading, setLoading] = useState(true);
    const fetchLedger = async () => {
        try {
            const res = await fetch("/api/erp/ledger");
            const data = await res.json();
            setAccounts(data.ledgerAccounts || []);
            setEntries(data.journalEntries || []);
            if (data.trialBalance)
                setTrialBalance(data.trialBalance);
        }
        catch (e) {
            console.error(e);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchLedger();
    }, []);
    return (<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Chart of Accounts & Trial Balance (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <span>📖</span> Chart of Accounts
            </h3>
            <span className="text-xs font-mono font-semibold text-zinc-500">Tally Double-Entry</span>
          </div>

          <div className="divide-y divide-zinc-100 max-h-[380px] overflow-y-auto">
            {accounts.map((acc) => (<div key={acc.id} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <span className="font-mono text-zinc-400 font-bold mr-2">[{acc.code}]</span>
                  <span className="font-bold text-zinc-900">{acc.name}</span>
                  <p className="text-[10px] text-zinc-500 uppercase">{acc.group}</p>
                </div>
                <span className="font-mono font-extrabold text-amber-700">₹{acc.balance.toLocaleString("en-IN")}</span>
              </div>))}
          </div>
        </div>

        {/* Trial Balance Banner */}
        <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-4 text-white shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase">Double-Entry Trial Balance</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${trialBalance.isBalanced ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400"}`}>
              {trialBalance.isBalanced ? "✓ BALANCED" : "⚠️ UNBALANCED"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs pt-1 border-t border-zinc-800">
            <div>
              <p className="text-[10px] text-zinc-400">Total Debit:</p>
              <p className="text-sm font-extrabold font-mono text-emerald-400">₹{trialBalance.totalDebit.toLocaleString("en-IN")}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-400">Total Credit:</p>
              <p className="text-sm font-extrabold font-mono text-blue-400">₹{trialBalance.totalCredit.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Journal Entry Postings Audit (7 cols) */}
      <div className="lg:col-span-7 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900">Double-Entry Journal Postings Log</h3>
          <button onClick={fetchLedger} className="text-xs font-bold text-amber-600 hover:text-amber-700">
            🔄 Refresh Ledger
          </button>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {entries.map((je) => (<div key={je.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5">
                <span className="font-bold text-amber-700 font-mono">{je.entryNumber}</span>
                <span className="text-zinc-500 text-[10px]">{new Date(je.entryDate).toLocaleDateString("en-IN")}</span>
              </div>
              <p className="text-zinc-700 text-[11px] italic">{je.narration}</p>

              <div className="bg-white rounded border border-zinc-200 p-2 space-y-1">
                {je.postings.map((p) => (<div key={p.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-[11px] gap-1">
                    <span className="font-medium text-zinc-800 break-words">
                      [{p.account.code}] {p.account.name}
                    </span>
                    <div className="sm:space-x-4 font-mono font-semibold shrink-0">
                      {p.debit > 0 ? (<span className="text-emerald-700">Dr: ₹{p.debit.toFixed(2)}</span>) : (<span className="text-blue-700">Cr: ₹{p.credit.toFixed(2)}</span>)}
                    </div>
                  </div>))}
              </div>
            </div>))}
        </div>
      </div>
    </div>);
}
