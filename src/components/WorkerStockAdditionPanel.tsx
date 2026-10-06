"use client";

import { useCallback, useState, useEffect } from "react";

interface StockAddition {
  id: string;
  productId: string;
  workerId: string;
  bagCount: number;
  bagWeight: number;
  totalWeight: number;
  status: string;
  note?: string;
  createdAt: string;
  product: { name: string; unit: string };
  worker: { name: string };
}

interface Product {
  id: string;
  name: string;
  unit: string;
  bagWeight?: number;
  minBulkBags: number;
  maxBulkBags: number;
}

export function WorkerStockAdditionPanel({ products }: { products: Product[] }) {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");
  const [bagCount, setBagCount] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [additions, setAdditions] = useState<StockAddition[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const [bagWeight, setBagWeight] = useState<number>(30);

  useEffect(() => {
    if (selectedProduct) {
      // Default to 30 if the product's bagWeight is not 30 or 50
      const pw = selectedProduct.bagWeight;
      setBagWeight(pw === 50 ? 50 : 30);
    }
  }, [selectedProduct]);

  const totalWeight = bagCount * bagWeight;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/stock-additions", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAdditions(data.additions.filter((a: StockAddition) => a.status === "PENDING"));
      }
    } catch (err) {
      console.error("Failed to load additions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedProduct) {
      setError("Please select a product");
      return;
    }

    if (bagCount < selectedProduct.minBulkBags || bagCount > selectedProduct.maxBulkBags) {
      setError(
        `Bags must be between ${selectedProduct.minBulkBags} and ${selectedProduct.maxBulkBags}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/stock-additions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          bagCount,
          bagWeight,
          note: note || undefined,
        }),
      });

      if (res.ok) {
        setSuccess(`✅ Added ${bagCount} bags of ${selectedProduct.name}`);
        setBagCount(1);
        setNote("");
        await load();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add stock");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-800">📦 Add Packed Bags to Inventory</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">
              Number of Bags (min: {selectedProduct?.minBulkBags}, max: {selectedProduct?.maxBulkBags})
            </label>
            <input
              type="number"
              value={bagCount}
              onChange={(e) => setBagCount(Math.max(1, parseInt(e.target.value) || 0))}
              min={selectedProduct?.minBulkBags}
              max={selectedProduct?.maxBulkBags}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">
              Bag Weight ({selectedProduct?.unit || "kg"})
            </label>
            <div className="flex gap-2">
              <select
                value={bagWeight}
                onChange={(e) => setBagWeight(parseFloat(e.target.value))}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none flex-1"
              >
                <option value={30}>30 kg</option>
                <option value={50}>50 kg</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-sm text-blue-900">
            Bag Weight: <span className="font-bold">{bagWeight} {selectedProduct?.unit}</span> per bag
          </p>
          <p className="text-sm text-blue-900">
            Total Weight: <span className="font-bold">{totalWeight} {selectedProduct?.unit}</span>
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add any notes about these packed bags..."
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            rows={2}
          />
        </div>

        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit for Approval"}
        </button>
      </form>

      {additions.length > 0 && (
        <div className="border-t border-zinc-200 pt-4">
          <h3 className="mb-3 font-semibold text-zinc-800">Your Pending Submissions</h3>
          <div className="space-y-2">
            {additions.map((addition) => (
              <div
                key={addition.id}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{addition.product.name}</p>
                  <p className="text-xs text-zinc-500">
                    {addition.bagCount} bags × {addition.bagWeight} {addition.product.unit}
                  </p>
                </div>
                <span className="inline-block rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
