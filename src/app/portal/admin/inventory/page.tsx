"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@prisma/client";
import { PortalNav } from "@/components/PortalNav";
import { CATEGORIES } from "@/lib/types";
import { StockAlertsPanel } from "@/components/StockAlertsPanel";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { BarcodeLabelModal } from "@/components/BarcodeLabelModal";

const AVAILABILITY_OPTIONS = [
  { value: "NON_GST", label: "Non-GST (Cash Counter)", badge: "bg-orange-100 text-orange-800 border border-orange-200", icon: "💵" },
  { value: "GST",     label: "GST (Counter Tax Bill)",  badge: "bg-amber-100 text-amber-800 border border-amber-200",   icon: "🧾" },
  { value: "WEB",     label: "Website (Online Store)",  badge: "bg-indigo-100 text-indigo-800 border border-indigo-200", icon: "🌐" },
  { value: "BOTH",    label: "⚡ All 3-in-1 (Non-GST + GST + Web)", badge: "bg-blue-100 text-blue-700 border border-blue-200 font-bold", icon: "⚡" },
];

const emptyProduct = {
  name: "",
  category: "Dals",
  price: 0,
  costPrice: 0,
  barcode: "",
  webPrice: null as number | null,
  counterPrice: null as number | null,
  counterGstPrice: null as number | null,
  stock: 0,
  unpackedStock: 0,
  minStock: 5,
  maxStock: 100,
  bagWeight: 30,
  minBulkBags: 1,
  maxBulkBags: 9999,
  unit: "kg",
  image: "",
  availability: "NON_GST" as "GST" | "NON_GST" | "BOTH" | "WEB" | "WALK_IN",
  parentId: null as string | null,
};

interface SalesStats {
  summary: {
    counterGstOrders: number;
    counterGstRevenue: number;
    counterGstQty: number;
    counterNonGstOrders: number;
    counterNonGstRevenue: number;
    counterNonGstQty: number;
    webOrders: number;
    webRevenue: number;
    webQty: number;
    totalOrders: number;
    totalRevenue: number;
  };
  productStats: Record<
    string,
    {
      counterGstQty: number;
      counterGstRevenue: number;
      counterNonGstQty: number;
      counterNonGstRevenue: number;
      webQty: number;
      webRevenue: number;
    }
  >;
}

/** Upload a file and return its public URL */
async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
  const data = await res.json();
  if (data.url) return data.url;
  throw new Error(data.error ?? "Upload failed");
}

/** Small image picker component */
function ImagePicker({
  value,
  onChange,
  size = "lg",
}: {
  value: string;
  onChange: (url: string) => void;
  size?: "sm" | "lg";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch {
      alert("Image upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const thumbSize = size === "lg" ? "h-24 w-24" : "h-12 w-12";
  const btnSize = size === "lg" ? "px-4 py-2 min-h-[44px] text-sm" : "px-3 py-1.5 min-h-[36px] text-xs";

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div
        className={`${thumbSize} rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 transition-colors`}
        onClick={() => inputRef.current?.click()}
        title="Click to upload image"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="product" className="h-full w-full object-cover" />
        ) : (
          <span className="text-zinc-400 text-2xl">📷</span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className={`${btnSize} rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center active:scale-95`}
        >
          {uploading ? "Uploading…" : value ? "Change" : "Upload"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className={`${btnSize} rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors inline-flex items-center justify-center active:scale-95`}
          >
            Remove
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

/** Availability badge pill */
function AvailabilityBadge({ value, unit }: { value: string; unit?: string }) {
  const opt = AVAILABILITY_OPTIONS.find((o) => o.value === value) ?? AVAILABILITY_OPTIONS[3];

  const restriction =
    value === "NON_GST"
      ? (unit === "bag" ? "💵 Cash Counter · 🎒 Bag Count" : "💵 Cash Counter · ⚖️ KG Count (1kg, 500g, 250g & 1 Bag)")
      : value === "GST"
      ? "🧾 Tax Bill Counter Only"
      : value === "WEB"
      ? "🌐 Online Storefront Only"
      : "⚡ All 3-in-1 Channels (🎒 Bag Count)";

  return (
    <div className="flex flex-col gap-0.5 items-start">
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${opt.badge}`}>
        {opt.icon} {opt.label}
      </span>
      <span className="text-[10px] text-zinc-500 font-bold">{restriction}</span>
    </div>
  );
}

/** Reusable 30kg, 50kg, and Custom Bag Weight selector */
function BagWeightSelector({
  value,
  onChange,
  isCustom,
  setIsCustom,
  dark = false,
}: {
  value: string;
  onChange: (val: string) => void;
  isCustom: boolean;
  setIsCustom: (val: boolean) => void;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className={`text-xs font-bold flex items-center gap-1.5 ${dark ? "text-amber-200" : "text-zinc-700"}`}>
          <span>🎒 Bag Size / Weight:</span>
        </label>
        <span
          className={`text-[11px] font-extrabold px-2 py-0.5 rounded shadow-2xs border ${
            dark
              ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
              : "bg-amber-100 text-amber-950 border border-amber-300"
          }`}
        >
          {value || 30} KG per Bag
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setIsCustom(false);
            onChange("25");
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
            !isCustom && value === "25"
              ? dark
                ? "bg-amber-400 text-zinc-950 ring-2 ring-amber-300 shadow-xs"
                : "bg-zinc-900 text-amber-400 ring-2 ring-amber-400 shadow-xs"
              : dark
              ? "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
              : "bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-100"
          }`}
        >
          <span>🎒 25 KG Bag</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setIsCustom(false);
            onChange("30");
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
            !isCustom && value === "30"
              ? dark
                ? "bg-amber-400 text-zinc-950 ring-2 ring-amber-300 shadow-xs"
                : "bg-zinc-900 text-amber-400 ring-2 ring-amber-400 shadow-xs"
              : dark
              ? "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
              : "bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-100"
          }`}
        >
          <span>🎒 30 KG Bag</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setIsCustom(false);
            onChange("50");
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
            !isCustom && value === "50"
              ? dark
                ? "bg-amber-400 text-zinc-950 ring-2 ring-amber-300 shadow-xs"
                : "bg-zinc-900 text-amber-400 ring-2 ring-amber-400 shadow-xs"
              : dark
              ? "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
              : "bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-100"
          }`}
        >
          <span>🎒 50 KG Bag</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setIsCustom(true);
            if (value === "25" || value === "30" || value === "50") {
              onChange("35");
            }
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
            isCustom
              ? dark
                ? "bg-amber-400 text-zinc-950 ring-2 ring-amber-300 shadow-xs"
                : "bg-zinc-900 text-amber-400 ring-2 ring-amber-400 shadow-xs"
              : dark
              ? "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
              : "bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-100"
          }`}
        >
          <span>⚙️ Custom (25-50kg)</span>
        </button>
        {isCustom && (
          <div className="flex items-center gap-1 animate-in fade-in">
            <input
              type="number"
              step="0.5"
              min="1"
              placeholder="e.g. 25"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`w-24 rounded-lg border-2 px-2.5 py-1 text-xs font-black focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                dark
                  ? "bg-zinc-800 text-amber-300 border-amber-400"
                  : "bg-white text-zinc-900 border-amber-400"
              }`}
            />
            <span className={`text-xs font-black ${dark ? "text-amber-200" : "text-zinc-700"}`}>KG</span>
          </div>
        )}
      </div>
      <span className="text-[10px] text-zinc-400">
        Each whole bag contains {value || 30} kilograms
      </span>
    </div>
  );
}

export default function AdminInventoryPage() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState<typeof emptyProduct>(emptyProduct);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editingAvail, setEditingAvail] = useState<string | null>(null);
  const [activeOrders, setActiveOrders] = useState<Record<string, number>>({});
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<"SEARCH" | "ADD_PRODUCT">("SEARCH");
  const [labelModalProduct, setLabelModalProduct] = useState<Product | null>(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  // Non-GST Manual Pack Entry State (All prices optional)
  const [nonGstPackType, setNonGstPackType] = useState<"PACKET" | "BAG">("PACKET");
  const [price1kg, setPrice1kg] = useState<string>("");
  const [price500g, setPrice500g] = useState<string>("");
  const [price250g, setPrice250g] = useState<string>("");
  const [bagName, setBagName] = useState<string>("");
  const [bagWeightInput, setBagWeightInput] = useState<string>("30");
  const [isCustomBagWeight, setIsCustomBagWeight] = useState<boolean>(false);
  const [bagPriceInput, setBagPriceInput] = useState<string>("");

  // Filters
  const [channelFilter, setChannelFilter] = useState<"ALL" | "WALK_IN_NONGST" | "WALK_IN_GST" | "WEB" | "THREE_IN_ONE">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    const [meRes, prodRes, ordersRes, arrivalsRes, salesStatsRes] = await Promise.all([
      fetch("/api/auth/me", { credentials: "include" }),
      fetch("/api/products?active=false", { credentials: "include" }),
      fetch("/api/products/active-orders", { credentials: "include" }),
      fetch("/api/stock-additions?limit=20", { credentials: "include" }),
      fetch("/api/products/sales-stats", { credentials: "include" }),
    ]);
    const me = await meRes.json();
    if (!me.user) {
      window.location.href = "/portal/login";
      return;
    }
    setUser(me.user);
    const data = await prodRes.json();
    const productList: Product[] = data.products ?? [];
    setProducts(productList);

    if (salesStatsRes.ok) {
      const statsData = await salesStatsRes.json();
      setSalesStats(statsData);
    }

    const ordersData = await ordersRes.json();
    setActiveOrders(ordersData.counts ?? {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { void load(); }, [load]);

  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [addingSubmitting, setAddingSubmitting] = useState(false);

  async function bulkSyncAll3in1() {
    const bothProducts = products.filter((p) => p.availability === "BOTH");
    if (bothProducts.length === 0) {
      alert("No 3-in-1 products found to sync.");
      return;
    }
    setBulkSyncing(true);
    try {
      let count = 0;
      for (const p of bothProducts) {
        if (p.counterPrice !== p.price || p.counterGstPrice !== p.price || p.webPrice !== p.price) {
          await fetch(`/api/products/${p.id}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              counterPrice: p.price,
              counterGstPrice: p.price,
              webPrice: p.price,
            }),
          });
          count++;
        }
      }
      await load();
      alert(`✅ 3-in-1 Auto-Sync Complete: ${count} product(s) synchronized across Cash Counter, GST Counter, and Website.`);
    } catch {
      alert("Failed to sync some products.");
    } finally {
      setBulkSyncing(false);
    }
  }

  async function updateProduct(id: string, updates: Partial<Product>) {
    setSaving(id);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to update product.");
      } else {
        await load();
      }
    } catch {
      alert("Error updating product.");
    } finally {
      setSaving(null);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    setSaving(id);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let message = `Delete failed (${res.status})`;
        try {
          const data = JSON.parse(text || "null");
          if (data?.error) message = data.error;
        } catch {
          if (text) message = `${message}: ${text}`;
        }
        throw new Error(message);
      }
      await load();
      alert("Product deleted successfully.");
    } catch (error) {
      console.error("Delete product error:", error);
      const msg = error instanceof Error ? error.message : "Delete failed";
      if (msg.includes("completed") || msg.includes("used in orders") || msg.includes("referenced")) {
        const doArchive = confirm(
          msg + "\n\nThis product is referenced by existing orders and cannot be deleted. Archive (hide) it instead?"
        );
        if (doArchive) {
          try {
            await updateProduct(id, { active: false });
            alert("Product archived (hidden) successfully.");
          } catch {
            alert("Failed to archive product.");
          }
        }
      } else {
        alert(msg);
      }
    } finally {
      setSaving(null);
    }
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");

    if (!newProduct.name.trim()) {
      setAddError("Please enter a Product Name");
      return;
    }

    setAddingSubmitting(true);
    try {
      if (newProduct.availability === "NON_GST") {
        if (nonGstPackType === "PACKET") {
          const p1 = parseFloat(price1kg) || 0;
          const p500 = parseFloat(price500g) || 0;
          const p250 = parseFloat(price250g) || 0;

          if (p1 <= 0 && p500 <= 0 && p250 <= 0) {
            setAddError("Please enter at least one pack price (1kg, 500gm, or 250gm). All prices are optional, but at least one is required.");
            setAddingSubmitting(false);
            return;
          }

          // Case A: 1 kg price entered -> becomes main/parent product
          if (p1 > 0) {
            const mainPayload = {
              ...newProduct,
              name: newProduct.name.trim(),
              price: p1,
              counterPrice: p1,
              counterGstPrice: null,
              webPrice: null,
              unit: "kg",
              barcode: newProduct.barcode?.trim() || null,
            };

            const res = await fetch("/api/products", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(mainPayload),
            });
            const data = await res.json();
            if (!res.ok) {
              setAddError(data.error ?? "Failed to create product");
              setAddingSubmitting(false);
              return;
            }

            const parentId = data.product.id;

            // Create 500gm variant if entered
            if (p500 > 0) {
              await fetch("/api/products", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: `${newProduct.name.trim()} 500gm`,
                  category: newProduct.category,
                  price: p500,
                  counterPrice: p500,
                  counterGstPrice: null,
                  webPrice: null,
                  unit: "500g",
                  stock: newProduct.stock,
                  costPrice: newProduct.costPrice ? newProduct.costPrice * 0.5 : 0,
                  availability: "NON_GST",
                  parentId,
                }),
              });
            }

            // Create 250gm variant if entered
            if (p250 > 0) {
              await fetch("/api/products", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: `${newProduct.name.trim()} 250gm`,
                  category: newProduct.category,
                  price: p250,
                  counterPrice: p250,
                  counterGstPrice: null,
                  webPrice: null,
                  unit: "250g",
                  stock: newProduct.stock,
                  costPrice: newProduct.costPrice ? newProduct.costPrice * 0.25 : 0,
                  availability: "NON_GST",
                  parentId,
                }),
              });
            }

            setAddSuccess(`✅ Product "${newProduct.name.trim()}" and pack variants created successfully!`);
          } else if (p500 > 0) {
            // Case B: 1kg not entered, 500gm entered -> 500gm becomes main product
            const mainPayload = {
              ...newProduct,
              name: `${newProduct.name.trim()} 500gm`,
              price: p500,
              counterPrice: p500,
              counterGstPrice: null,
              webPrice: null,
              unit: "500g",
              barcode: newProduct.barcode?.trim() || null,
            };

            const res = await fetch("/api/products", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(mainPayload),
            });
            const data = await res.json();
            if (!res.ok) {
              setAddError(data.error ?? "Failed to create product");
              setAddingSubmitting(false);
              return;
            }

            if (p250 > 0) {
              await fetch("/api/products", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: `${newProduct.name.trim()} 250gm`,
                  category: newProduct.category,
                  price: p250,
                  counterPrice: p250,
                  counterGstPrice: null,
                  webPrice: null,
                  unit: "250g",
                  stock: newProduct.stock,
                  costPrice: newProduct.costPrice ? newProduct.costPrice * 0.5 : 0,
                  availability: "NON_GST",
                  parentId: data.product.id,
                }),
              });
            }
            setAddSuccess(`✅ Product "${newProduct.name.trim()} 500gm" created successfully!`);
          } else if (p250 > 0) {
            // Case C: Only 250gm entered
            const mainPayload = {
              ...newProduct,
              name: `${newProduct.name.trim()} 250gm`,
              price: p250,
              counterPrice: p250,
              counterGstPrice: null,
              webPrice: null,
              unit: "250g",
              barcode: newProduct.barcode?.trim() || null,
            };

            const res = await fetch("/api/products", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(mainPayload),
            });
            const data = await res.json();
            if (!res.ok) {
              setAddError(data.error ?? "Failed to create product");
              setAddingSubmitting(false);
              return;
            }
            setAddSuccess(`✅ Product "${newProduct.name.trim()} 250gm" created successfully!`);
          }
        } else {
          // BAG OPTION: Separate wholesale bag product
          const pBag = parseFloat(bagPriceInput) || 0;
          const bWeight = parseFloat(bagWeightInput) || 30;

          if (pBag <= 0) {
            setAddError("Please enter a valid price for the wholesale bag.");
            setAddingSubmitting(false);
            return;
          }

          const finalBagName = bagName.trim() || `${newProduct.name.trim()} ${bWeight}kg Bag`;
          const bagPayload = {
            ...newProduct,
            name: finalBagName,
            price: pBag,
            counterPrice: pBag,
            counterGstPrice: null,
            webPrice: null,
            unit: "bag",
            bagWeight: bWeight,
            barcode: newProduct.barcode?.trim() || null,
          };

          const res = await fetch("/api/products", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bagPayload),
          });
          const data = await res.json();
          if (!res.ok) {
            setAddError(data.error ?? "Failed to create wholesale bag product");
            setAddingSubmitting(false);
            return;
          }
          setAddSuccess(`✅ Wholesale Bag "${finalBagName}" created successfully!`);
        }
      } else {
        // GST, WEB, or BOTH
        if (newProduct.price <= 0) {
          setAddError("Selling Price must be greater than ₹0.00");
          setAddingSubmitting(false);
          return;
        }

        let finalCounterGst = newProduct.counterGstPrice;
        let finalCounterPrice = newProduct.counterPrice;
        let finalWebPrice = newProduct.webPrice;

        if (newProduct.availability === "GST") {
          finalCounterGst = newProduct.counterGstPrice ?? newProduct.price;
          finalCounterPrice = null;
          finalWebPrice = null;
        } else if (newProduct.availability === "WEB") {
          finalWebPrice = newProduct.webPrice ?? newProduct.price;
          finalCounterGst = null;
          finalCounterPrice = null;
        } else if (newProduct.availability === "BOTH") {
          finalCounterGst = newProduct.price;
          finalCounterPrice = newProduct.price;
          finalWebPrice = newProduct.price;
        }

        const payload = {
          ...newProduct,
          barcode: newProduct.barcode?.trim() || null,
          counterGstPrice: finalCounterGst,
          counterPrice: finalCounterPrice,
          webPrice: finalWebPrice,
          unit: "bag",
          bagWeight: parseFloat(bagWeightInput) || 30,
        };

        const res = await fetch("/api/products", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setAddError(data.error ?? "Failed to create product");
          setAddingSubmitting(false);
          return;
        }
        setAddSuccess(`✅ Product "${data.product?.name || newProduct.name}" created successfully!`);
      }

      setNewProduct(emptyProduct);
      setPrice1kg("");
      setPrice500g("");
      setPrice250g("");
      setBagName("");
      setBagPriceInput("");
      setBagWeightInput("30");
      setNonGstPackType("PACKET");
      await load();
      setTimeout(() => setAddSuccess(""), 5000);
    } catch {
      setAddError("Something went wrong while adding the product");
    } finally {
      setAddingSubmitting(false);
    }
  }

  if (!user) return <p className="p-8 text-center font-medium text-zinc-500">Loading Price &amp; Inventory Manager…</p>;

  // Filter products by channel, category, and search query
  const filteredProducts = products.filter((p) => {
    // Channel filter rule:
    if (channelFilter === "WALK_IN_NONGST") {
      if (p.availability !== "NON_GST" && p.availability !== "BOTH" && p.availability !== "WALK_IN") return false;
    } else if (channelFilter === "WALK_IN_GST") {
      if (p.availability !== "GST" && p.availability !== "BOTH" && p.availability !== "WALK_IN") return false;
    } else if (channelFilter === "WEB") {
      if (p.availability !== "WEB" && p.availability !== "BOTH") return false;
    } else if (channelFilter === "THREE_IN_ONE") {
      if (p.availability !== "BOTH") return false;
    }

    // Category filter
    if (categoryFilter !== "All" && p.category !== categoryFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    return true;
  });

  const showGstCol = channelFilter === "ALL" || channelFilter === "WALK_IN_GST" || channelFilter === "THREE_IN_ONE";
  const showNonGstCol = channelFilter === "ALL" || channelFilter === "WALK_IN_NONGST" || channelFilter === "THREE_IN_ONE";
  const showWebCol = channelFilter === "ALL" || channelFilter === "WEB" || channelFilter === "THREE_IN_ONE";
  const showSyncCol = channelFilter === "ALL" || channelFilter === "THREE_IN_ONE";
  const showGstSales = channelFilter === "ALL" || channelFilter === "WALK_IN_GST" || channelFilter === "THREE_IN_ONE";
  const showNonGstSales = channelFilter === "ALL" || channelFilter === "WALK_IN_NONGST" || channelFilter === "THREE_IN_ONE";
  const showWebSales = channelFilter === "ALL" || channelFilter === "WEB" || channelFilter === "THREE_IN_ONE";

  const stats = salesStats?.summary;
  const pStats = salesStats?.productStats ?? {};

  // Calculate inventory total valuation
  const packedValuation = products.reduce((sum, p) => sum + p.stock * (p.costPrice || p.price), 0);
  const unpackedValuation = products.reduce((sum, p) => sum + (p.unpackedStock || 0) * (p.costPrice || p.price), 0);
  const totalInventoryValuation = packedValuation + unpackedValuation;

  const totalSalesRevenue = stats?.totalRevenue ?? 0;

  const isBagMode =
    newProduct.availability === "GST" ||
    newProduct.availability === "WEB" ||
    newProduct.availability === "BOTH" ||
    (newProduct.availability === "NON_GST" && nonGstPackType === "BAG");

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      <PortalNav role="ADMIN" userName={user.name} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        
        {/* Page Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Price &amp; Inventory Manager</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Manage product pricing and channel availability for <strong>GST Sales</strong> (Web + Counter) and <strong>Non-GST Sales</strong> (Counter Memos).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load()}
              className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-sm transition-all"
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>

        <StockAlertsPanel />

        {/* Storefront & GST Rule Banner */}
        <div className="mb-6 rounded-2xl bg-amber-500/10 border border-amber-200 p-4 text-xs text-amber-900 flex items-center gap-3">
          <span className="text-2xl">📢</span>
          <div>
            <strong>Website Sales Rule:</strong> Products made available on the website (set to <strong>GST Only</strong> or <strong>GST + Non-GST</strong>) are strictly available for <strong>GST Sale only</strong> on the customer storefront. Products marked <strong>Non-GST Only</strong> are restricted to Cash Counter Memos.
          </div>
        </div>

        {/* ============================================================
            SECTION 1 — CHANNEL SALES OVERVIEW (GST vs NON-GST vs WEBSITE)
        ============================================================ */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Cash Counter GST Sales Card */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-500/10 via-white to-amber-50/40 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  🧾 Cash Counter (GST)
                </span>
                <div className="mt-3 text-2xl font-extrabold text-amber-950">
                  ₹{(stats?.counterGstRevenue ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-3xl">🧾</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-1 border-t border-amber-100 pt-2.5 text-xs">
              <div>
                <span className="text-zinc-500 block">Tax Invoices</span>
                <span className="font-bold text-amber-900">{stats?.counterGstOrders ?? 0} bills</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Units Sold</span>
                <span className="font-bold text-amber-900">{stats?.counterGstQty ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Cash Counter Non-GST Sales Card */}
          <div className="relative overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50/80 via-white to-orange-50/30 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800">
                  💵 Cash Counter (Non-GST)
                </span>
                <div className="mt-3 text-2xl font-extrabold text-orange-950">
                  ₹{(stats?.counterNonGstRevenue ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-3xl">💵</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-1 border-t border-orange-100 pt-2.5 text-xs">
              <div>
                <span className="text-zinc-500 block">Cash Memos</span>
                <span className="font-bold text-orange-900">{stats?.counterNonGstOrders ?? 0} memos</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Units Sold</span>
                <span className="font-bold text-orange-900">{stats?.counterNonGstQty ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Website Sales Card */}
          <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                  🌐 Website Sales (GST)
                </span>
                <div className="mt-3 text-2xl font-extrabold text-indigo-950">
                  ₹{(stats?.webRevenue ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-3xl">🌐</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-1 border-t border-indigo-100 pt-2.5 text-xs">
              <div>
                <span className="text-zinc-500 block">Online Orders</span>
                <span className="font-bold text-indigo-900">{stats?.webOrders ?? 0} orders</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Units Sold</span>
                <span className="font-bold text-indigo-900">{stats?.webQty ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Combined Inventory & Sales Revenue Card */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  📦 Inventory &amp; Revenue
                </span>
                <div className="mt-3 text-2xl font-extrabold text-emerald-950">
                  ₹{totalSalesRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-3xl">📊</span>
            </div>
            <div className="mt-4 border-t border-emerald-100 pt-2.5 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Stock Asset Value:</span>
                <strong className="text-zinc-900">₹{totalInventoryValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong>
              </div>
              <div className="mt-1 text-[11px] text-emerald-700">
                Total Orders: <strong>{stats?.totalOrders ?? 0}</strong>
              </div>
            </div>
          </div>

        </div>

        {/* ============================================================
            SECTION 2 — ADD NEW PRODUCT (With Channel Availability)
        ============================================================ */}
        <form
          onSubmit={addProduct}
          className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-800">＋ Add New Product</h2>
            <span className="text-xs text-zinc-400">Configure prices &amp; Sales Channel Availability</span>
          </div>

          {addSuccess && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">
              {addSuccess}
            </div>
          )}
          {addError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
              {addError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Product Name *</label>
              <input
                required
                placeholder="e.g. 1kg Desi Unpolished Toor Dal"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-base sm:text-sm min-h-[42px] focus:border-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-zinc-500 font-medium">
                💡 You can enter &ldquo;1kg Desi Unpolished Toor Dal&rdquo; — the system automatically provides 1kg, 500gm, 250gm &amp; 1 Bag pack options!
              </span>
            </div>

            {/* 2. Category */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Category *</label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-base sm:text-sm min-h-[42px] focus:border-blue-500 focus:outline-none"
              >
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* 3. Packed Stock Weight / Bag Count */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600 flex items-center justify-between">
                <span>{isBagMode ? "🎒 Stock (Number of Bags) *" : "⚖️ Stock (kg) *"}</span>
                {isBagMode ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                    🎒 {bagWeightInput || 30}kg per bag
                  </span>
                ) : (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900 border border-emerald-200">
                    ⚖️ KG Count
                  </span>
                )}
              </label>
              <input
                required
                type="number"
                step="1"
                min="0"
                placeholder={isBagMode ? "e.g. 10 or 25 bags" : "e.g. 100 kg"}
                value={newProduct.stock || ""}
                onChange={(e) => setNewProduct({ ...newProduct, stock: parseFloat(e.target.value) || 0 })}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-base sm:text-sm min-h-[42px] focus:border-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-zinc-400">
                {isBagMode
                  ? `Total bags available (${bagWeightInput || 30}kg / bag)`
                  : "Total weight in kilograms (auto-distributed across 1kg, 500g, 250g packs)"}
              </span>
            </div>

            {/* 4. Unpacked Stock */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                {isBagMode ? "Loose / Unpacked Bags" : "Unpacked / Loose Stock (kg)"}
              </label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={newProduct.unpackedStock || ""}
                onChange={(e) => setNewProduct({ ...newProduct, unpackedStock: parseFloat(e.target.value) || 0 })}
                className="rounded-xl border border-emerald-300 bg-emerald-50/30 px-3 py-2 text-base sm:text-sm min-h-[42px] focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* 5. Sales Channel Availability */}
            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4 p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                  <span>🏪 Sales Channel Availability *</span>
                  <span className="text-[11px] font-normal text-zinc-500">(Choose where this product will be sold)</span>
                </label>
                <span className="text-[11px] font-semibold text-blue-700">
                  {newProduct.availability === "NON_GST" && "💵 Shows Non-GST price only"}
                  {newProduct.availability === "GST" && "🧾 Shows GST price only"}
                  {newProduct.availability === "WEB" && "🌐 Shows Website price only"}
                  {newProduct.availability === "BOTH" && "⚡ 1-time price entry (auto-applies to all 3)"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {AVAILABILITY_OPTIONS.map((opt) => {
                  const isChecked = newProduct.availability === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl p-2.5 border transition-all ${
                        isChecked
                          ? "border-blue-600 bg-white ring-2 ring-blue-500/20 shadow-sm"
                          : "border-zinc-200 bg-white/70 hover:bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="new-availability"
                        value={opt.value}
                        checked={isChecked}
                        onChange={() => {
                          const p = newProduct.price || 0;
                          if (opt.value === "NON_GST") {
                            setNewProduct({
                              ...newProduct,
                              availability: "NON_GST",
                              unit: nonGstPackType === "BAG" ? "bag" : "kg",
                              bagWeight: nonGstPackType === "BAG" ? (parseFloat(bagWeightInput) || 30) : 30,
                              counterPrice: p > 0 ? p : newProduct.counterPrice,
                              counterGstPrice: null,
                              webPrice: null,
                            });
                          } else if (opt.value === "GST") {
                            setNewProduct({
                              ...newProduct,
                              availability: "GST",
                              unit: "bag",
                              bagWeight: parseFloat(bagWeightInput) || 30,
                              counterGstPrice: p > 0 ? p : newProduct.counterGstPrice,
                              counterPrice: null,
                              webPrice: null,
                            });
                          } else if (opt.value === "WEB") {
                            setNewProduct({
                              ...newProduct,
                              availability: "WEB",
                              unit: "bag",
                              bagWeight: parseFloat(bagWeightInput) || 30,
                              webPrice: p > 0 ? p : newProduct.webPrice,
                              counterGstPrice: null,
                              counterPrice: null,
                            });
                          } else {
                            setNewProduct({
                              ...newProduct,
                              availability: "BOTH",
                              unit: "bag",
                              bagWeight: parseFloat(bagWeightInput) || 30,
                              counterGstPrice: p > 0 ? p : null,
                              counterPrice: p > 0 ? p : null,
                              webPrice: p > 0 ? p : null,
                            });
                          }
                        }}
                        className="accent-blue-600"
                      />
                      <span className="text-xs font-semibold text-zinc-800">{opt.icon} {opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 6. Base Selling Price */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Base Selling Price (₹) *</label>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={newProduct.price || ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setNewProduct((prev) => {
                    const next = { ...prev, price: val };
                    if (prev.availability === "NON_GST") next.counterPrice = val;
                    else if (prev.availability === "GST") next.counterGstPrice = val;
                    else if (prev.availability === "WEB") next.webPrice = val;
                    else if (prev.availability === "BOTH") {
                      next.counterGstPrice = val;
                      next.counterPrice = val;
                      next.webPrice = val;
                    }
                    return next;
                  });
                }}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* 7. Cost Price */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Cost Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newProduct.costPrice || ""}
                onChange={(e) => setNewProduct({ ...newProduct, costPrice: parseFloat(e.target.value) || 0 })}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-base sm:text-sm min-h-[42px] focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* 8. Barcode / SKU */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-600">Barcode / SKU</label>
                <button
                  type="button"
                  onClick={() => {
                    const generated = `RADHE-${Math.floor(100000 + Math.random() * 900000)}`;
                    setNewProduct((prev) => ({ ...prev, barcode: generated }));
                  }}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                >
                  ⚡ Auto-Gen
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  placeholder="e.g. RADHE-1001 or scan"
                  value={newProduct.barcode || ""}
                  onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                  className="rounded-xl border border-zinc-300 px-3 py-2 text-base sm:text-sm min-h-[42px] focus:border-blue-500 focus:outline-none w-full"
                />
                <button
                  type="button"
                  onClick={() => {
                    setScannerTarget("ADD_PRODUCT");
                    setScannerOpen(true);
                  }}
                  className="rounded-xl bg-zinc-800 text-white p-2.5 min-h-[42px] min-w-[42px] hover:bg-zinc-700 transition shrink-0 flex items-center justify-center"
                  title="Scan barcode with camera"
                >
                  📷
                </button>
              </div>
            </div>

            {/* Dynamically Attached Price Inputs based on Channel Choice */}
            {newProduct.availability === "NON_GST" && (
              <div className="flex flex-col gap-4 bg-orange-50/80 p-4 rounded-2xl border-2 border-orange-300 sm:col-span-2 lg:col-span-4">
                {/* Header & Mode Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-black text-orange-950 flex items-center gap-1.5">
                      <span>💵 Non-GST Cash Counter Pricing</span>
                      <span className="rounded bg-orange-200 px-2 py-0.5 text-[10px] text-orange-900 font-bold">
                        Manual Entry • All Optional
                      </span>
                    </label>
                    <p className="text-[11px] text-orange-800 font-medium mt-0.5">
                      Enter the exact selling price for each pack. You do not have to enter all packs—enter only what you sell.
                    </p>
                  </div>

                  {/* Switch between Packet Packs and Wholesale Bag */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-orange-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        setNonGstPackType("PACKET");
                        setNewProduct((prev) => ({ ...prev, unit: "kg" }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        nonGstPackType === "PACKET"
                          ? "bg-orange-600 text-white shadow-xs"
                          : "text-zinc-600 hover:bg-orange-50"
                      }`}
                    >
                      <span>⚖️ Packet Packs</span>
                      <span className="text-[10px] opacity-80">(1kg, 500g, 250g)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNonGstPackType("BAG");
                        setNewProduct((prev) => ({
                          ...prev,
                          unit: "bag",
                          bagWeight: parseFloat(bagWeightInput) || 30,
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        nonGstPackType === "BAG"
                          ? "bg-zinc-900 text-amber-400 shadow-xs"
                          : "text-zinc-600 hover:bg-orange-50"
                      }`}
                    >
                      <span>🎒 Wholesale Bag</span>
                      <span className="text-[10px] opacity-80">(Separate Option)</span>
                    </button>
                  </div>
                </div>

                {/* OPTION 1: PACKET PACKS (1kg, 500g, 250g) */}
                {nonGstPackType === "PACKET" && (
                  <div className="rounded-xl bg-white border border-orange-200 p-4 shadow-2xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-orange-950">
                          ⚖️ Manual Pack Price Entry
                        </span>
                        <span className="text-[10px] font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                          Optional Fields • Type exact price
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 font-medium">
                        🚫 Wholesale bag is excluded here (use separate option above)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {/* 1 kg Price */}
                      <div className="flex flex-col gap-1 p-3 rounded-xl border border-orange-200 bg-orange-50/30">
                        <label className="text-xs font-bold text-orange-950 flex items-center justify-between">
                          <span>⚖️ 1 kg Price (₹)</span>
                          <span className="text-[10px] text-zinc-500 font-normal">Optional</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 150"
                          value={price1kg}
                          onChange={(e) => {
                            setPrice1kg(e.target.value);
                            const val = parseFloat(e.target.value) || 0;
                            if (val > 0) {
                              setNewProduct((prev) => ({ ...prev, price: val, counterPrice: val, unit: "kg" }));
                            }
                          }}
                          className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2 text-sm font-black text-orange-950 focus:border-orange-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-orange-700">Main 1kg retail packet</span>
                      </div>

                      {/* 500 gm Price */}
                      <div className="flex flex-col gap-1 p-3 rounded-xl border border-orange-200 bg-orange-50/30">
                        <label className="text-xs font-bold text-orange-950 flex items-center justify-between">
                          <span>⚖️ 500 gm Price (₹)</span>
                          <span className="text-[10px] text-zinc-500 font-normal">Optional</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 77"
                          value={price500g}
                          onChange={(e) => setPrice500g(e.target.value)}
                          className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2 text-sm font-black text-orange-950 focus:border-orange-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-orange-700">½ kg retail packet</span>
                      </div>

                      {/* 250 gm Price */}
                      <div className="flex flex-col gap-1 p-3 rounded-xl border border-orange-200 bg-orange-50/30">
                        <label className="text-xs font-bold text-orange-950 flex items-center justify-between">
                          <span>⚖️ 250 gm Price (₹)</span>
                          <span className="text-[10px] text-zinc-500 font-normal">Optional</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 39"
                          value={price250g}
                          onChange={(e) => setPrice250g(e.target.value)}
                          className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2 text-sm font-black text-orange-950 focus:border-orange-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-orange-700">¼ kg retail packet</span>
                      </div>
                    </div>

                    {/* Active Packs Summary Preview */}
                    <div className="flex items-center gap-2 pt-2 border-t border-orange-100 text-xs text-orange-900 font-medium">
                      <span className="font-bold">📋 POS Pack Buttons Created:</span>
                      {price1kg || price500g || price250g ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {price1kg && (
                            <span className="bg-orange-100 border border-orange-300 px-2 py-0.5 rounded font-bold text-orange-950">
                              1 kg: ₹{price1kg}
                            </span>
                          )}
                          {price500g && (
                            <span className="bg-orange-100 border border-orange-300 px-2 py-0.5 rounded font-bold text-orange-950">
                              500 gm: ₹{price500g}
                            </span>
                          )}
                          {price250g && (
                            <span className="bg-orange-100 border border-orange-300 px-2 py-0.5 rounded font-bold text-orange-950">
                              250 gm: ₹{price250g}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic">None yet — enter at least one pack price</span>
                      )}
                    </div>
                  </div>
                )}

                {/* OPTION 2: WHOLESALE BAG (SEPARATE OPTION) */}
                {nonGstPackType === "BAG" && (
                  <div className="rounded-xl bg-zinc-900 text-amber-300 p-4 border border-amber-500/40 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                          🎒 Wholesale Bag (Separate Product)
                        </span>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Sold strictly as a whole wholesale bag. KG count (1kg, 500g, 250g) is completely disabled.
                        </p>
                      </div>
                      <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded font-bold">
                        Whole Bag Only
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {/* Bag Name / Description */}
                      <div className="flex flex-col gap-1 sm:col-span-1">
                        <label className="text-xs font-bold text-amber-200">
                          Bag Name / Label
                        </label>
                        <input
                          type="text"
                          placeholder={newProduct.name ? `${newProduct.name} ${bagWeightInput}kg Bag` : "e.g. Toor Dal 30kg Bag"}
                          value={bagName}
                          onChange={(e) => setBagName(e.target.value)}
                          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                        />
                        <span className="text-[10px] text-zinc-400">Custom bag variant name</span>
                      </div>

                      {/* Bag Weight Selector */}
                      <div className="flex flex-col gap-1 sm:col-span-1">
                        <BagWeightSelector
                          value={bagWeightInput}
                          onChange={(val) => {
                            setBagWeightInput(val);
                            setNewProduct((prev) => ({
                              ...prev,
                              bagWeight: parseFloat(val) || 30,
                            }));
                          }}
                          isCustom={isCustomBagWeight}
                          setIsCustom={setIsCustomBagWeight}
                          dark={true}
                        />
                      </div>

                      {/* Whole Bag Price */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-amber-200">
                          Price per Bag (₹) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="e.g. 3300"
                          value={bagPriceInput}
                          onChange={(e) => {
                            setBagPriceInput(e.target.value);
                            const val = parseFloat(e.target.value) || 0;
                            if (val > 0) {
                              setNewProduct((prev) => ({
                                ...prev,
                                price: val,
                                counterPrice: val,
                                unit: "bag",
                                bagWeight: parseFloat(bagWeightInput) || 30,
                              }));
                            }
                          }}
                          className="w-full rounded-lg border border-amber-400 bg-zinc-800 px-3 py-2 text-sm font-black text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                        <span className="text-[10px] text-amber-400/80">Exact selling price for 1 full bag</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {newProduct.availability === "GST" && (
              <div className="flex flex-col gap-3 bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 sm:col-span-2 lg:col-span-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-2">
                  <div>
                    <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <span>🧾 Counter GST Tax Bill Pricing</span>
                      <span className="rounded bg-amber-200 px-1.5 py-0.2 text-[10px] text-amber-900 font-bold">Attached to GST</span>
                    </label>
                    <span className="text-[10px] text-amber-700">Sold strictly by number of bags for official GST tax invoicing. Non-GST and Website inputs hidden.</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <BagWeightSelector
                    value={bagWeightInput}
                    onChange={(val) => {
                      setBagWeightInput(val);
                      setNewProduct((prev) => ({
                        ...prev,
                        bagWeight: parseFloat(val) || 30,
                      }));
                    }}
                    isCustom={isCustomBagWeight}
                    setIsCustom={setIsCustomBagWeight}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-amber-900">
                      GST Price per Bag (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder={`Auto-synced: ₹${newProduct.price || 0}`}
                      value={newProduct.counterGstPrice ?? ""}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : null;
                        setNewProduct({ ...newProduct, counterGstPrice: val });
                      }}
                      className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-black text-amber-950 focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-amber-700">Tax bill counter billing price per {bagWeightInput || 30}kg bag.</span>
                  </div>
                </div>
              </div>
            )}

            {newProduct.availability === "WEB" && (
              <div className="flex flex-col gap-3 bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200 sm:col-span-2 lg:col-span-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200 pb-2">
                  <div>
                    <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <span>🌐 Website Storefront Pricing</span>
                      <span className="rounded bg-indigo-200 px-1.5 py-0.2 text-[10px] text-indigo-900 font-bold">Online Store</span>
                    </label>
                    <span className="text-[10px] text-indigo-700">Online storefront whole bag sales with GST included. Counter prices are hidden.</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <BagWeightSelector
                    value={bagWeightInput}
                    onChange={(val) => {
                      setBagWeightInput(val);
                      setNewProduct((prev) => ({
                        ...prev,
                        bagWeight: parseFloat(val) || 30,
                      }));
                    }}
                    isCustom={isCustomBagWeight}
                    setIsCustom={setIsCustomBagWeight}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-indigo-900">
                      Website Price per Bag (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder={`Auto-synced: ₹${newProduct.price || 0}`}
                      value={newProduct.webPrice ?? ""}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : null;
                        setNewProduct({ ...newProduct, webPrice: val });
                      }}
                      className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-black text-indigo-950 focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-indigo-700">Online customer selling price per {bagWeightInput || 30}kg bag.</span>
                  </div>
                </div>
              </div>
            )}

            {newProduct.availability === "BOTH" && (
              <div className="sm:col-span-2 lg:col-span-4 rounded-2xl bg-gradient-to-r from-blue-50 via-emerald-50 to-blue-50 border-2 border-blue-300 p-4 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚡</span>
                      <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider">
                        All 3-in-1 Unified Single Price (Number of Bags)
                      </h4>
                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                        Enter 1 Time → Applies to All 3 Channels
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-1">
                      Enter the bag price once below or press Enter. Cash Counter, GST Tax Bill, and Online Web Store all automatically receive this identical bag price:
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-orange-200 px-2.5 py-1 text-xs font-bold text-orange-950 shadow-2xs">
                        <span>💵 Non-GST Counter:</span>
                        <span className="text-orange-700 font-black">₹{newProduct.price || 0}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-950 shadow-2xs">
                        <span>🧾 GST Counter:</span>
                        <span className="text-amber-700 font-black">₹{newProduct.price || 0}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-950 shadow-2xs">
                        <span>🌐 Website Storefront:</span>
                        <span className="text-indigo-700 font-black">₹{newProduct.price || 0}</span>
                      </span>
                    </div>
                  </div>

                  {/* Direct Enabled Input inside 3-in-1 Card */}
                  <div className="rounded-xl bg-white border-2 border-blue-500 p-3 shadow-sm self-start sm:self-center shrink-0 flex flex-col gap-1 min-w-[220px]">
                    <label className="text-[11px] font-black text-blue-950 uppercase tracking-wide flex items-center justify-between">
                      <span>⚡ 3-in-1 Bag Price (₹) *</span>
                      <span className="text-[9px] text-blue-600 font-bold">Enter once ↵</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-sm font-black text-blue-600">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={newProduct.price || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setNewProduct((prev) => ({
                            ...prev,
                            price: val,
                            counterPrice: val,
                            counterGstPrice: val,
                            webPrice: val,
                            unit: "bag",
                            bagWeight: parseFloat(bagWeightInput) || 30,
                          }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-full pl-7 pr-2.5 py-1.5 text-sm font-black text-blue-950 rounded-lg border border-blue-300 bg-blue-50/20 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 text-center">
                      ✓ Active &amp; Auto-syncing
                    </span>
                  </div>
                </div>

                {/* Bag Size / Weight Selector for 3-in-1 */}
                <div className="pt-2 border-t border-blue-200">
                  <BagWeightSelector
                    value={bagWeightInput}
                    onChange={(val) => {
                      setBagWeightInput(val);
                      setNewProduct((prev) => ({
                        ...prev,
                        bagWeight: parseFloat(val) || 30,
                      }));
                    }}
                    isCustom={isCustomBagWeight}
                    setIsCustom={setIsCustomBagWeight}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Image upload */}
          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium text-zinc-600">Product Image</label>
            <ImagePicker
              value={newProduct.image}
              onChange={(url) => setNewProduct({ ...newProduct, image: url })}
              size="lg"
            />
          </div>

          <button
            type="submit"
            disabled={addingSubmitting}
            className="mt-5 w-full sm:w-auto rounded-xl bg-blue-600 px-6 py-3 min-h-[44px] font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center active:scale-95 cursor-pointer"
          >
            {addingSubmitting ? "Adding Product…" : "＋ Save Product to Inventory"}
          </button>
        </form>

        {/* ============================================================
            SECTION 3 — CHANNEL FILTER TABS & SEARCH BAR
        ============================================================ */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
          
          {/* Channel Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setChannelFilter("ALL")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all min-h-[38px] flex items-center justify-center ${
                channelFilter === "ALL"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              All Channels ({products.length})
            </button>
            <button
              onClick={() => setChannelFilter("WALK_IN_NONGST")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all min-h-[38px] flex items-center gap-1 ${
                channelFilter === "WALK_IN_NONGST"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-orange-50 text-orange-800 hover:bg-orange-100"
              }`}
            >
              💵 Cash Counter (Non-GST)
            </button>
            <button
              onClick={() => setChannelFilter("WALK_IN_GST")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all min-h-[38px] flex items-center gap-1 ${
                channelFilter === "WALK_IN_GST"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              🧾 Cash Counter (GST)
            </button>
            <button
              onClick={() => setChannelFilter("WEB")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all min-h-[38px] flex items-center gap-1 ${
                channelFilter === "WEB"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
              }`}
            >
              🌐 Website Storefront
            </button>
            <button
              onClick={() => setChannelFilter("THREE_IN_ONE")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all min-h-[38px] flex items-center gap-1 ${
                channelFilter === "THREE_IN_ONE"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-blue-50 text-blue-800 hover:bg-blue-100"
              }`}
            >
              ⚡ All 3-in-1 Channels
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                setScannerTarget("SEARCH");
                setScannerOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-2 text-xs font-bold transition shadow-xs cursor-pointer min-h-[38px] flex-1 sm:flex-none"
              title="Scan product barcode with camera or scanner gun"
            >
              <span>📷</span>
              <span>Scan Barcode</span>
            </button>

            <button
              type="button"
              disabled={bulkSyncing}
              onClick={bulkSyncAll3in1}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 text-xs font-bold transition disabled:opacity-50 cursor-pointer min-h-[38px] flex-1 sm:flex-none"
              title="Ensure all 3-in-1 products have the exact same price across Counter and Web"
            >
              <span>⚡</span>
              <span>{bulkSyncing ? "Syncing…" : "Auto-Sync 3-in-1"}</span>
            </button>

            <input
              type="text"
              placeholder="Search by name or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-zinc-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none w-full sm:w-52 min-h-[38px]"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-zinc-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none w-full sm:w-auto min-h-[38px]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs text-zinc-400 hover:text-zinc-600 px-2 py-1 min-h-[38px] flex items-center"
              >
                Clear
              </button>
            )}
          </div>

        </div>

        {/* ============================================================
            SECTION 4 — PRODUCT LIST (Cards on Mobile, Table on Desktop)
        ============================================================ */}

        {/* Mobile Product Cards View (< md) */}
        <div className="block md:hidden space-y-3 mb-6">
          {filteredProducts.map((p) => {
            const isPublished = p.active;
            return (
              <div
                key={`mobile-prod-${p.id}`}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail / Image Picker */}
                  <div className="shrink-0">
                    {editingImage === p.id ? (
                      <div className="py-1">
                        <ImagePicker
                          value={p.image ?? ""}
                          onChange={async (url) => {
                            await updateProduct(p.id, { image: url || null } as Partial<Product>);
                            setEditingImage(null);
                          }}
                          size="sm"
                        />
                        <button
                          type="button"
                          className="mt-1 text-xs text-zinc-400 hover:text-zinc-600 font-bold"
                          onClick={() => setEditingImage(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div
                        className="relative h-14 w-14 rounded-xl border border-zinc-200 overflow-hidden cursor-pointer bg-zinc-50 flex items-center justify-center"
                        onClick={() => setEditingImage(p.id)}
                        title="Tap to change image"
                      >
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-zinc-400 text-xl">📷</span>
                        )}
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center font-bold py-0.5">
                          Edit
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name, Category, Barcode */}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-zinc-900 text-sm leading-snug">{p.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{p.category}</p>
                    {p.barcode && (
                      <p className="text-[10px] font-mono text-zinc-400 mt-0.5">SKU: {p.barcode}</p>
                    )}
                  </div>
                </div>

                {/* Channel Availability Badge */}
                <div className="border-t border-zinc-100 pt-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-500">Channel:</span>
                  <AvailabilityBadge value={p.availability ?? "BOTH"} unit={p.unit} />
                </div>

                {/* Pricing & Stock Details */}
                <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Selling Price</span>
                    <span className="font-black text-sm text-zinc-900">₹{p.price}</span>
                    <span className="text-[10px] text-zinc-400 block">/{p.unit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Cost Price</span>
                    <span className="font-semibold text-zinc-700">₹{p.costPrice ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Stock</span>
                    <span className="font-bold text-emerald-700">{p.stock} {p.unit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Non-GST / GST</span>
                    <span className="font-mono text-zinc-600">
                      ₹{p.counterPrice ?? p.price} / ₹{p.counterGstPrice ?? p.price}
                    </span>
                  </div>
                </div>

                {/* Actions: Publish toggle and Delete */}
                <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2.5">
                  <button
                    type="button"
                    onClick={() => updateProduct(p.id, { active: !p.active })}
                    disabled={saving === p.id}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all min-h-[40px] ${
                      isPublished
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                    } disabled:opacity-50 active:scale-95`}
                  >
                    <span className={`h-2 w-2 rounded-full ${isPublished ? "bg-green-500" : "bg-zinc-400"}`} />
                    {isPublished ? "Published 🟢" : "Hidden 🔴"}
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteProduct(p.id)}
                    disabled={saving === p.id || (activeOrders[p.id] ?? 0) > 0}
                    className="rounded-xl bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[40px] inline-flex items-center justify-center active:scale-95"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-400 text-sm">
              No products match the selected filter or search query.
            </div>
          )}
        </div>

        {/* Desktop Product Table (>= md) */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-[1250px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="px-3 py-3.5 w-14">Image</th>
                <th className="px-3 py-3.5">Product Name</th>
                <th className="px-3 py-3.5">Category</th>
                <th className="px-3 py-3.5 w-32">Barcode / SKU</th>
                <th className="px-3 py-3.5">Channel Availability</th>
                {showNonGstCol && (
                  <th className="px-3 py-3.5 bg-orange-50/60 text-orange-950 w-32">
                    💵 Counter Non-GST Price
                  </th>
                )}
                {showGstCol && (
                  <th className="px-3 py-3.5 bg-amber-50/60 text-amber-950 w-32">
                    🧾 Counter GST Price
                  </th>
                )}
                {showWebCol && (
                  <th className="px-3 py-3.5 bg-indigo-50/60 text-indigo-950 w-32">
                    🌐 Website Price
                  </th>
                )}
                {showSyncCol && (
                  <th className="px-3 py-3.5 bg-blue-50/60 text-blue-950 w-36 text-center">
                    ⚡ 3-in-1 Price (Enter Once)
                  </th>
                )}
                <th className="px-3 py-3.5 w-24">Base Price</th>
                <th className="px-3 py-3.5 w-24">Cost Price</th>
                <th className="px-3 py-3.5 w-20">Stock</th>
                {showNonGstSales && (
                  <th className="px-3 py-3.5 bg-orange-50/40 text-orange-900 w-28 text-center">
                    💵 Non-GST Sales
                  </th>
                )}
                {showGstSales && (
                  <th className="px-3 py-3.5 bg-amber-50/40 text-amber-900 w-28 text-center">
                    🧾 GST Sales
                  </th>
                )}
                {showWebSales && (
                  <th className="px-3 py-3.5 bg-indigo-50/40 text-indigo-900 w-28 text-center">
                    🌐 Website Sales
                  </th>
                )}
                <th className="px-3 py-3.5 w-24">Publish</th>
                <th className="px-3 py-3.5 w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredProducts.map((p) => {
                const avail = p.availability ?? "BOTH";
                const isPublished = p.active;
                const itemSales = pStats[p.id] ?? {
                  counterGstQty: 0,
                  counterGstRevenue: 0,
                  counterNonGstQty: 0,
                  counterNonGstRevenue: 0,
                  webQty: 0,
                  webRevenue: 0,
                };

                return (
                  <tr key={p.id} className="hover:bg-zinc-50/80 transition-colors">
                    
                    {/* Image */}
                    <td className="px-3 py-3">
                      {editingImage === p.id ? (
                        <div className="py-1">
                          <ImagePicker
                            value={p.image ?? ""}
                            onChange={async (url) => {
                              await updateProduct(p.id, { image: url || null } as Partial<Product>);
                              setEditingImage(null);
                            }}
                            size="sm"
                          />
                          <button
                            type="button"
                            className="mt-1 text-xs text-zinc-400 hover:text-zinc-600"
                            onClick={() => setEditingImage(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div
                          className="relative h-11 w-11 rounded-xl border border-zinc-200 overflow-hidden cursor-pointer group"
                          onClick={() => setEditingImage(p.id)}
                        >
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-base">
                              📷
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">Edit</span>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Name + Parent Info */}
                    <td className="px-3 py-3 font-semibold text-zinc-900">
                      <div>{p.name}</div>
                      {(p as Product & { parentId?: string | null; parent?: { name: string } | null }).parentId && (
                        <div className="text-xs text-blue-600 font-normal mt-0.5">
                          📦 Variant of: {(p as Product & { parent?: { name: string } | null }).parent?.name ?? "Unknown"}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3 text-zinc-600 text-xs font-medium">{p.category}</td>

                    {/* Barcode / SKU */}
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 border border-zinc-200 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-800">
                          🏷️ {p.barcode || "No Barcode"}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setLabelModalProduct(p)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                            title="Print barcode label"
                          >
                            🖨️ Label
                          </button>
                          {!p.barcode && (
                            <button
                              type="button"
                              onClick={async () => {
                                const autoCode = `RADHE-${Math.floor(100000 + Math.random() * 900000)}`;
                                await updateProduct(p.id, { barcode: autoCode } as Partial<Product>);
                              }}
                              className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold cursor-pointer"
                              title="Generate Barcode"
                            >
                              ⚡ Gen
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Channel Availability */}
                    <td className="px-3 py-3">
                      {editingAvail === p.id ? (
                        <div className="flex flex-col gap-1 rounded-xl border border-blue-300 bg-blue-50 p-2 text-xs w-44">
                          {AVAILABILITY_OPTIONS.map((opt) => (
                            <label key={opt.value} className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium">
                              <input
                                type="radio"
                                name={`avail-${p.id}`}
                                value={opt.value}
                                defaultChecked={avail === opt.value}
                                onChange={async () => {
                                  if (opt.value === "BOTH") {
                                    await updateProduct(p.id, {
                                      availability: "BOTH",
                                      counterPrice: p.price,
                                      counterGstPrice: p.price,
                                      webPrice: p.price,
                                    } as Partial<Product>);
                                  } else {
                                    await updateProduct(p.id, { availability: opt.value } as Partial<Product>);
                                  }
                                  setEditingAvail(null);
                                }}
                                className="accent-blue-600"
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                          <button
                            type="button"
                            className="mt-1 text-[10px] text-zinc-400 text-left"
                            onClick={() => setEditingAvail(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 items-start">
                          <div className="cursor-pointer" onClick={() => setEditingAvail(p.id)}>
                            <AvailabilityBadge value={avail} unit={p.unit} />
                          </div>
                          {avail === "NON_GST" && (
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateProduct(p.id, { unit: "kg" } as Partial<Product>);
                                }}
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition border ${
                                  p.unit !== "bag"
                                    ? "bg-orange-600 text-white border-orange-700"
                                    : "bg-white text-orange-950 border-orange-200 hover:bg-orange-100"
                                }`}
                                title="Switch to KG Count (1kg, 500g, 250g)"
                              >
                                ⚖️ KG Count
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateProduct(p.id, { unit: "bag", bagWeight: 30 } as Partial<Product>);
                                }}
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition border ${
                                  p.unit === "bag" && (p.bagWeight === 30 || !p.bagWeight)
                                    ? "bg-zinc-900 text-amber-300 border-zinc-800"
                                    : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                                }`}
                                title="Switch to 30 kg Bag (Bag Count only)"
                              >
                                🎒 30kg Bag
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateProduct(p.id, { unit: "bag", bagWeight: 50 } as Partial<Product>);
                                }}
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition border ${
                                  p.unit === "bag" && p.bagWeight === 50
                                    ? "bg-zinc-900 text-amber-300 border-zinc-800"
                                    : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                                }`}
                                title="Switch to 50 kg Bag (Bag Count only)"
                              >
                                🎒 50kg Bag
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Counter Non-GST Price (₹) */}
                    {showNonGstCol && (
                      <td className="px-3 py-3 bg-orange-50/30">
                        {avail !== "NON_GST" && avail !== "BOTH" ? (
                          <div className="text-[11px] text-zinc-400 italic">
                            — ({avail === "GST" ? "GST only" : "Web only"})
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <input
                              type="number"
                              step="0.01"
                              placeholder={p.price ? `₹${p.price}` : "0"}
                              defaultValue={p.counterPrice ?? ""}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                              onBlur={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : null;
                                if (val != null && !isNaN(val) && val !== p.counterPrice) {
                                  if (avail === "BOTH") {
                                    updateProduct(p.id, {
                                      price: val,
                                      counterPrice: val,
                                      counterGstPrice: val,
                                      webPrice: val,
                                    } as Partial<Product>);
                                  } else {
                                    updateProduct(p.id, { counterPrice: val } as Partial<Product>);
                                  }
                                }
                              }}
                              className="w-20 rounded-lg border border-orange-300 bg-white px-2 py-1 text-xs font-bold text-orange-950 focus:outline-none focus:border-orange-500"
                            />
                            <span className="text-[10px] text-orange-700 font-medium">
                              {avail === "BOTH" ? "⚡ 3-in-1 Synced" : p.counterPrice ? "Custom Memo" : `Base (₹${p.price})`}
                            </span>
                          </div>
                        )}
                      </td>
                    )}

                    {/* Counter GST Price (₹) */}
                    {showGstCol && (
                      <td className="px-3 py-3 bg-amber-50/30">
                        {avail !== "GST" && avail !== "BOTH" ? (
                          <div className="text-[11px] text-zinc-400 italic">
                            — ({avail === "NON_GST" ? "Non-GST only" : "Web only"})
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <input
                              type="number"
                              step="0.01"
                              placeholder={p.price ? `₹${p.price}` : "0"}
                              defaultValue={p.counterGstPrice ?? ""}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                              onBlur={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : null;
                                if (val != null && !isNaN(val) && val !== p.counterGstPrice) {
                                  if (avail === "BOTH") {
                                    updateProduct(p.id, {
                                      price: val,
                                      counterPrice: val,
                                      counterGstPrice: val,
                                      webPrice: val,
                                    } as Partial<Product>);
                                  } else {
                                    updateProduct(p.id, { counterGstPrice: val } as Partial<Product>);
                                  }
                                }
                              }}
                              className="w-20 rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-bold text-amber-950 focus:outline-none focus:border-amber-500"
                            />
                            <span className="text-[10px] text-amber-700 font-medium">
                              {avail === "BOTH" ? "⚡ 3-in-1 Synced" : p.counterGstPrice ? "Custom GST" : `Base (₹${p.price})`}
                            </span>
                          </div>
                        )}
                      </td>
                    )}

                    {/* Website Price (₹) */}
                    {showWebCol && (
                      <td className="px-3 py-3 bg-indigo-50/30">
                        {avail !== "WEB" && avail !== "BOTH" ? (
                          <div className="text-[11px] text-zinc-400 italic">
                            — ({avail === "NON_GST" ? "Non-GST only" : "GST only"})
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <input
                              type="number"
                              step="0.01"
                              placeholder={p.price ? `₹${p.price}` : "0"}
                              defaultValue={p.webPrice ?? ""}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                              onBlur={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : null;
                                if (val != null && !isNaN(val) && val !== p.webPrice) {
                                  if (avail === "BOTH") {
                                    updateProduct(p.id, {
                                      price: val,
                                      counterPrice: val,
                                      counterGstPrice: val,
                                      webPrice: val,
                                    } as Partial<Product>);
                                  } else {
                                    updateProduct(p.id, { webPrice: val } as Partial<Product>);
                                  }
                                }
                              }}
                              className="w-20 rounded-lg border border-indigo-300 bg-white px-2 py-1 text-xs font-bold text-indigo-950 focus:outline-none focus:border-indigo-500"
                            />
                            <span className="text-[10px] text-indigo-700 font-medium">
                              {avail === "BOTH" ? "⚡ 3-in-1 Synced" : p.webPrice ? "Custom Web" : `Base (₹${p.price})`}
                            </span>
                          </div>
                        )}
                      </td>
                    )}

                    {/* 3-in-1 Price (Enter Once) Cell */}
                    {showSyncCol && (
                      <td className="px-3 py-3 bg-blue-50/30 text-center">
                        {avail !== "BOTH" ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 rounded bg-zinc-100 text-zinc-500 px-2 py-0.5 text-[10px] font-semibold border border-zinc-200">
                              🔒 Not 3-in-1
                            </span>
                            <span className="text-[9px] text-zinc-400">
                              {avail === "GST" ? "GST only" : avail === "WEB" ? "Web only" : "Non-GST only"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-xs font-black text-blue-900">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                defaultValue={p.price}
                                key={`3in1-${p.id}-${p.price}`}
                                placeholder={String(p.price || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.currentTarget.blur();
                                  }
                                }}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val > 0 && (val !== p.price || val !== p.counterPrice || val !== p.counterGstPrice || val !== p.webPrice)) {
                                    updateProduct(p.id, {
                                      price: val,
                                      counterPrice: val,
                                      counterGstPrice: val,
                                      webPrice: val,
                                    } as Partial<Product>);
                                  }
                                }}
                                className="w-20 pl-2 pr-1 py-1 rounded-lg border-2 border-blue-400 bg-white text-xs font-black text-blue-950 shadow-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-center"
                                title="Type price once and press Enter — automatically updates Non-GST, GST, and Web Store prices together"
                              />
                            </div>
                            {(p.counterGstPrice ?? p.price) === (p.counterPrice ?? p.price) && (p.counterPrice ?? p.price) === (p.webPrice ?? p.price) ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                                ✓ All 3 Synced
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={saving === p.id}
                                onClick={async () => {
                                  await updateProduct(p.id, {
                                    counterGstPrice: p.price,
                                    counterPrice: p.price,
                                    webPrice: p.price,
                                  } as Partial<Product>);
                                }}
                                className="rounded bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 text-[9px] font-bold shadow-xs transition"
                              >
                                {saving === p.id ? "Syncing..." : "⚡ Sync All 3"}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}

                    {/* Base Selling Price (₹) */}
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={p.price}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val !== p.price) {
                            if (p.availability === "BOTH") {
                              // 1-time price entry: auto-syncs all 3 channels to the new price
                              updateProduct(p.id, {
                                price: val,
                                counterPrice: val,
                                counterGstPrice: val,
                                webPrice: val,
                              } as Partial<Product>);
                            } else if (p.availability === "NON_GST") {
                              updateProduct(p.id, { price: val, counterPrice: val } as Partial<Product>);
                            } else if (p.availability === "GST") {
                              updateProduct(p.id, { price: val, counterGstPrice: val } as Partial<Product>);
                            } else if (p.availability === "WEB") {
                              updateProduct(p.id, { price: val, webPrice: val } as Partial<Product>);
                            } else {
                              updateProduct(p.id, { price: val });
                            }
                          }
                        }}
                        className="w-20 rounded-lg border border-zinc-200 px-2 py-1 text-xs font-semibold focus:outline-none"
                      />
                    </td>

                    {/* Cost Price (₹) */}
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={p.costPrice ?? 0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val !== p.costPrice) updateProduct(p.id, { costPrice: val });
                        }}
                        className="w-20 rounded-lg border border-zinc-200 px-2 py-1 text-xs focus:outline-none"
                      />
                    </td>

                    {/* Packed Stock */}
                    <td className="px-3 py-3 font-semibold text-zinc-900">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={p.stock}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val !== p.stock) updateProduct(p.id, { stock: val });
                          }}
                          className="w-14 rounded border border-zinc-200 px-1.5 py-1 text-xs focus:outline-none"
                        />
                        <span className="text-zinc-400 text-xs">{p.availability === "BOTH" || p.unit?.toLowerCase() === "bag" ? "bags" : p.unit}</span>
                      </div>
                    </td>

                    {/* Counter Non-GST Sales */}
                    {showNonGstSales && (
                      <td className="px-3 py-3 bg-orange-50/20 text-center">
                        <div className="text-xs font-bold text-orange-900">
                          {itemSales.counterNonGstQty > 0 ? `${itemSales.counterNonGstQty} ${p.unit}` : "0"}
                        </div>
                        <div className="text-[11px] text-orange-700 font-medium">
                          ₹{itemSales.counterNonGstRevenue.toLocaleString("en-IN")}
                        </div>
                      </td>
                    )}

                    {/* Counter GST Sales */}
                    {showGstSales && (
                      <td className="px-3 py-3 bg-amber-50/20 text-center">
                        <div className="text-xs font-bold text-amber-900">
                          {itemSales.counterGstQty > 0 ? `${itemSales.counterGstQty} ${p.unit}` : "0"}
                        </div>
                        <div className="text-[11px] text-amber-700 font-medium">
                          ₹{itemSales.counterGstRevenue.toLocaleString("en-IN")}
                        </div>
                      </td>
                    )}

                    {/* Website Sales */}
                    {showWebSales && (
                      <td className="px-3 py-3 bg-indigo-50/20 text-center">
                        <div className="text-xs font-bold text-indigo-900">
                          {itemSales.webQty > 0 ? `${itemSales.webQty} ${p.unit}` : "0"}
                        </div>
                        <div className="text-[11px] text-indigo-700 font-medium">
                          ₹{itemSales.webRevenue.toLocaleString("en-IN")}
                        </div>
                      </td>
                    )}

                    {/* Storefront Publish toggle */}
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => updateProduct(p.id, { active: !p.active })}
                        disabled={saving === p.id}
                        title={isPublished ? "Click to hide from customer storefront" : "Click to publish to customer storefront"}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                          isPublished
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                        } disabled:opacity-50`}
                      >
                        <span className={`h-2 w-2 rounded-full ${isPublished ? "bg-green-500" : "bg-zinc-400"}`} />
                        {isPublished ? "Published 🟢" : "Hidden 🔴"}
                      </button>
                    </td>

                    {/* Delete Action */}
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => deleteProduct(p.id)}
                        disabled={saving === p.id || (activeOrders[p.id] ?? 0) > 0}
                        title={
                          (activeOrders[p.id] ?? 0) > 0
                            ? `Cannot delete: ${activeOrders[p.id]} active order(s)`
                            : "Delete this product"
                        }
                        className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-4 py-12 text-center text-zinc-400">
                    No products match the selected channel filter or search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          💡 <strong>Pro Tip:</strong> Products configured with <strong>GST Only</strong> or <strong>GST + Non-GST</strong> will be sold under <strong>GST Sale only</strong> when listed on the customer website.
        </p>

        {/* Barcode Scanner Modal */}
        <BarcodeScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={(code) => {
            if (scannerTarget === "ADD_PRODUCT") {
              setNewProduct((prev) => ({ ...prev, barcode: code }));
              setScannerOpen(false);
            } else {
              setSearchQuery(code);
              setScannerOpen(false);
            }
          }}
          title={scannerTarget === "ADD_PRODUCT" ? "📷 Scan Product Barcode" : "📷 Scan to Find in Inventory"}
          subtitle={
            scannerTarget === "ADD_PRODUCT"
              ? "Align manufacturer barcode or sticker in viewfinder to populate Barcode field"
              : "Scan any product barcode to instantly locate and inspect in table"
          }
        />

        {/* Barcode Label Print Modal */}
        <BarcodeLabelModal
          isOpen={!!labelModalProduct}
          onClose={() => setLabelModalProduct(null)}
          product={labelModalProduct}
        />

      </div>
    </div>
  );
}
