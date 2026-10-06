"use client";

import { useEffect, useState, useCallback } from "react";
import { PortalNav } from "@/components/PortalNav";
import {
  formatCurrency,
  getProductWeightVariants,
  calculateVariantPrice,
  formatVariantProductName,
  getProductBagPrice,
  getProductKgPrice,
  getDefaultNonGstCategory,
  type WeightVariant,
} from "@/lib/types";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProductOption {
  id: string;
  name: string;
  price: number;
  counterPrice?: number | null;
  counterGstPrice?: number | null;
  barcode?: string | null;
  stock: number;
  unit: string;
  hsnCode?: string;
  gstRate?: number;
  bagWeight?: number | null;
  availability?: string;
  parentId?: string | null;
  variants?: Array<{
    id: string;
    name: string;
    price: number;
    counterPrice?: number | null;
    counterGstPrice?: number | null;
    unit?: string | null;
    bagWeight?: number | null;
    stock?: number | null;
  }> | null;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  hsnCode: string;
  gstRate: number;
}

interface CompletedBill {
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  stateCode: string;
  placeOfSupply: string;
  gstNumber?: string;
  notes: string;
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  discountAmount: number;
  date: string;
  paymentMode: string;
  billMode: "GST" | "NON_GST";
  invoiceNumber?: string;
  challanNumber?: string;
}

type BillMode = "GST" | "NON_GST";

// ─── All 37 Indian States + UTs ───────────────────────────────────────────────
const INDIAN_STATES = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "25", name: "Daman & Diu" },
  { code: "26", name: "Dadra & Nagar Haveli" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminTakeOrderPage() {
  const [user, setUser] = useState<{ name: string; role: "ADMIN" | "WORKER" } | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);

  // ── Bill Mode Toggle (Default to Wholesale GST) ─────────────────────────
  const [billMode, setBillMode] = useState<BillMode>("GST");
  const isGst = billMode === "GST";
  const [nonGstCategoryFilter, setNonGstCategoryFilter] = useState<"ALL" | "BAG" | "PACKET">("ALL");

  // ── Customer & Order fields ─────────────────────────────────────────────
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [stateCode, setStateCode] = useState("37");
  const [gstNumber, setGstNumber] = useState(""); // only for GST mode
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [status, setStatus] = useState<"DRAFT" | "COMPLETED">("COMPLETED");

  // ── UI State ────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [completedBill, setCompletedBill] = useState<CompletedBill | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [customerStatus, setCustomerStatus] = useState<"idle" | "looking" | "found" | "new">("idle");
  const [scannerOpen, setScannerOpen] = useState(false);

  // ── Load user & products ────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      const me = await meRes.json();
      if (!me.user) {
        window.location.href = "/portal/login";
        return;
      }
      setUser(me.user);

      const productsRes = await fetch("/api/products?active=true&orderType=WALK_IN", {
        credentials: "include",
      });
      const productsData = await productsRes.json();
      setProducts((productsData.products ?? []) as ProductOption[]);
    }
    load();
  }, []);

  // Autofill customer details when phone number reaches 10 digits
  useEffect(() => {
    const phone = customerPhone.trim();
    if (phone.length < 10) {
      setCustomerStatus("idle");
      return;
    }
    setCustomerStatus("looking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/erp/customers?phone=${encodeURIComponent(phone)}`);
        const data = await res.json();
        const cust = data.customer;
        if (cust) {
          setCustomerName(cust.name || "");
          setDeliveryAddress(cust.address || "");
          setStateCode(cust.stateCode || "27");
          setGstNumber(cust.gstNumber || "");
          setCustomerStatus("found");
        } else {
          setCustomerStatus("new");
        }
      } catch {
        setCustomerStatus("new");
      }
    }, 500);

    return () => clearTimeout(t);
  }, [customerPhone]);

  // ── Cart Operations ─────────────────────────────────────────────────────
  function addItemToCart(productId: string, addQty = 1, variant?: WeightVariant) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    if (product.stock <= 0) {
      setMessage({ type: "error", text: `${product.name} is out of stock.` });
      return;
    }

    const isGst = billMode === "GST";
    const bagW = product.bagWeight && product.bagWeight > 0 ? product.bagWeight : 30;
    const bagPrice = getProductBagPrice(product, isGst ? "GST" : "NON_GST");
    const kgPrice = getProductKgPrice(product, isGst ? "GST" : "NON_GST");

    let itemPrice: number;
    let itemUnit: string;
    let itemId = product.id;
    let itemName = product.name;

    if (variant) {
      if (variant.isBag) {
        itemId = `${product.id}-${bagW}kg_bag`;
        itemPrice = bagPrice;
        itemUnit = `1 Bag (${bagW}kg)`;
        itemName = `${product.name} (1 Bag - ${bagW}kg)`;
      } else {
        const childVariant = product.variants?.find((cv) =>
          cv.unit?.toLowerCase() === variant.id.toLowerCase() ||
          (variant.id === "500g" && (cv.unit === "500g" || cv.unit === "500gm")) ||
          (variant.id === "250g" && (cv.unit === "250g" || cv.unit === "250gm")) ||
          (variant.id === "5kg" && cv.unit === "5kg")
        );
        itemId = childVariant ? childVariant.id : `${product.id}-${variant.id}`;
        itemPrice = childVariant
          ? (childVariant.counterPrice ?? childVariant.price)
          : calculateVariantPrice(kgPrice, variant);
        itemUnit = variant.shortLabel;
        itemName = childVariant ? childVariant.name : formatVariantProductName(product.name, variant, bagW);
      }
    } else {
      if (isGst) {
        itemId = `${product.id}-${bagW}kg_bag`;
        itemPrice = bagPrice;
        itemUnit = `1 Bag (${bagW}kg)`;
        itemName = `${product.name} (Wholesale Bag - ${bagW}kg)`;
      } else {
        const defaultCat = getDefaultNonGstCategory(product.counterPrice ?? product.price, product.unit);
        if (defaultCat === "BAG") {
          itemId = `${product.id}-${bagW}kg_bag`;
          itemPrice = bagPrice;
          itemUnit = `1 Bag (${bagW}kg)`;
          itemName = `${product.name} (1 Bag - ${bagW}kg)`;
        } else {
          itemId = product.id;
          itemPrice = product.counterPrice ?? product.price;
          itemUnit = product.unit || "kg";
          itemName = product.name;
        }
      }
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === itemId);
      if (existing) {
        const newQty = existing.quantity + addQty;
        if (newQty > product.stock) {
          setMessage({
            type: "error",
            text: `Cannot exceed stock of ${product.stock} for ${product.name}.`,
          });
          return prev;
        }
        return prev.map((item) =>
          item.productId === itemId ? { ...item, quantity: newQty, price: itemPrice, unit: itemUnit } : item
        );
      }
      return [
        ...prev,
        {
          productId: itemId,
          name: itemName,
          price: itemPrice,
          quantity: Math.min(addQty, product.stock),
          unit: itemUnit,
          hsnCode: product.hsnCode || "0000",
          gstRate: isGst ? (product.gstRate || 5) : 0,
        },
      ];
    });
    setMessage(null);
  }

  // ── Handle Barcode Scan with Auto-Price Sync ───────────────────────────
  const handleBarcodeScanned = useCallback(
    (barcode: string) => {
      const clean = barcode.trim().toLowerCase();
      const product = products.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === clean) ||
          p.id.toLowerCase() === clean ||
          p.name.toLowerCase() === clean
      );

      if (!product) {
        setMessage({ type: "error", text: `❌ Barcode "${barcode}" not found in inventory.` });
        return;
      }

      addItemToCart(product.id, 1);

      const is3in1 = product.availability === "BOTH" || product.unit?.toLowerCase() === "bag" || product.unit?.toLowerCase() === "bags";
      const isGst = billMode === "GST";
      const bagW = product.bagWeight && product.bagWeight > 0 ? product.bagWeight : 30;
      const baseUnitPrice = isGst
        ? (product.counterGstPrice ?? product.price)
        : (product.counterPrice ?? product.price);
      const syncedPrice = (isGst && !is3in1) ? Math.round(baseUnitPrice * bagW) : baseUnitPrice;

      setMessage({
        type: "success",
        text: `✅ Scanned: ${product.name} — Auto-Synced Price: ₹${syncedPrice} / ${is3in1 ? "Bag" : isGst ? "Bag" : "kg"} added to bill!`,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, billMode]
  );

  // Background listener for physical USB/Bluetooth Barcode Scanner Guns
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          e.preventDefault();
          handleBarcodeScanned(buffer);
          buffer = "";
        }
      } else if (e.key.length === 1) {
        if (diff > 80) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBarcodeScanned]);

  function updateItemQty(productId: string, quantity: number) {
    const baseId = productId.split("-")[0];
    const product = products.find((item) => item.id === baseId);
    if (quantity <= 0) { removeItem(productId); return; }
    if (product && quantity > product.stock) {
      setMessage({ type: "error", text: `Max stock: ${product.stock} ${product.unit}` });
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  }

  function decrementCartItem(productId: string) {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter((item) => item.productId !== productId);
      return prev.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.max(0.1, item.quantity - 1) } : item
      );
    });
  }

  function updateItemPrice(productId: string, price: number) {
    setCartItems((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, price } : item))
    );
  }

  function removeItem(productId: string) {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  // ── Calculations ────────────────────────────────────────────────────────
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount =
    billMode === "GST"
      ? cartItems.reduce(
          (sum, item) => sum + item.price * item.quantity * ((item.gstRate || 5) / 100),
          0
        )
      : 0; // Non-GST: no tax breakdown
  const grossTotal = subtotal + taxAmount;
  const grandTotal = Math.max(0, Math.round(grossTotal - discountAmount));

  // ── Submit Bill ─────────────────────────────────────────────────────────
  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (cartItems.length === 0) {
      setMessage({ type: "error", text: "Add at least one item before creating the bill." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const posState = INDIAN_STATES.find((s) => s.code === stateCode);
      const placeOfSupply = posState ? `${posState.code}-${posState.name}` : "37-Andhra Pradesh";

      let responseData: any;

      if (billMode === "GST") {
        // ── GST Bill: use ERP orders API (calculates CGST/SGST/IGST) ──────
        const res = await fetch("/api/erp/orders", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: customerName.trim() || "Counter Sale",
            customerPhone: customerPhone.trim() || undefined,
            deliveryAddress: deliveryAddress.trim() || undefined,
            customerStateCode: stateCode,
            gstNumber: gstNumber.trim() || undefined,
            orderType: "WALK_IN",
            items: cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.price,
              unit: item.unit,
              discountPercent: 0,
            })),
            notes: `Payment: ${paymentMode}${notes.trim() ? ` | ${notes.trim()}` : ""}`,
          }),
        });
        responseData = await res.json();
        if (!res.ok) throw new Error(responseData.error ?? "Failed to create GST order.");
      } else {
        // ── Non-GST Bill: use cash-bills API (no tax calc) ────────────────
        const res = await fetch("/api/erp/cash-bills", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: customerName.trim() || "Counter Sale",
            customerPhone: customerPhone.trim() || undefined,
            paymentMode,
            items: cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.price,
              unit: item.unit,
            })),
            discountAmount,
            notes: notes.trim() || undefined,
          }),
        });
        responseData = await res.json();
        if (!res.ok) throw new Error(responseData.error ?? "Failed to create cash bill.");
      }

      const orderNum =
        responseData.order?.orderNumber ?? responseData.bill?.billNumber ?? 0;

      // Build receipt
      const bill: CompletedBill = {
        orderNumber: orderNum,
        customerName: customerName.trim() || "Counter Sale",
        customerPhone: customerPhone.trim() || "",
        deliveryAddress: deliveryAddress.trim(),
        stateCode,
        placeOfSupply,
        gstNumber: gstNumber.trim() || undefined,
        notes: notes.trim(),
        items: [...cartItems],
        subtotal,
        taxAmount,
        grandTotal,
        discountAmount,
        date: new Date().toLocaleString("en-IN"),
        paymentMode,
        billMode,
        invoiceNumber: responseData.invoice?.invoiceNumber,
        challanNumber: responseData.challan?.challanNumber,
      };

      setCompletedBill(bill);
      setShowReceipt(true);

      // Auto-save new customer for future auto-fill
      if (customerStatus === "new" && customerPhone.trim().length >= 10 && customerName.trim()) {
        try {
          await fetch("/api/erp/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: customerName.trim(),
              phone: customerPhone.trim(),
              address: deliveryAddress.trim() || undefined,
              stateCode,
              gstNumber: gstNumber.trim() || undefined,
            }),
          });
        } catch {
          // non-critical — ignore save errors
        }
      }

      // Reset form
      setCartItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setDeliveryAddress("");
      setGstNumber("");
      setStateCode("27");
      setDiscountAmount(0);
      setNotes("");
      setPaymentMode("Cash");
      setStatus("COMPLETED");
      setCustomerStatus("idle");
      setMessage({ type: "success", text: `✅ Bill #${orderNum} generated!` });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to create bill.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return <p className="p-8 text-center text-zinc-500">Loading...</p>;

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matches = !q
      ? !p.parentId
      : p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));

    if (!matches) return false;

    if (!isGst && nonGstCategoryFilter === "BAG") {
      const isBagUnit = p.unit?.toLowerCase() === "bag" || p.unit?.toLowerCase() === "bags";
      const is3in1 = p.availability === "BOTH";
      const hasBagWeight = (p.bagWeight && p.bagWeight > 0) || (p.counterPrice ?? p.price) >= 900;
      return isBagUnit || is3in1 || hasBagWeight;
    }

    if (!isGst && nonGstCategoryFilter === "PACKET") {
      const isBagUnit = p.unit?.toLowerCase() === "bag" || p.unit?.toLowerCase() === "bags";
      return !isBagUnit || (p.variants && p.variants.length > 0) || Boolean(p.bagWeight && p.bagWeight > 0);
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      <PortalNav role={user.role === "ADMIN" ? "ADMIN" : "WORKER"} userName={user.name} />

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900">⚡ Take Order (Wholesale GST Billing)</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Create wholesale orders, GST tax invoices, and track orders.
            </p>
          </div>

          {/* ── GST / Non-GST TOGGLE ──────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl bg-white border border-zinc-200 p-1.5 shadow-sm w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setBillMode("NON_GST")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-3.5 sm:px-5 py-2.5 text-xs sm:text-sm font-bold transition-all min-h-[42px] ${
                billMode === "NON_GST"
                  ? "bg-orange-500 text-white shadow-md"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <span className="text-base">🧾</span>
              <span>
                Non-GST Bill
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
                  Cash Memo
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setBillMode("GST")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-3.5 sm:px-5 py-2.5 text-xs sm:text-sm font-bold transition-all min-h-[42px] ${
                billMode === "GST"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <span className="text-base">📄</span>
              <span>
                GST Bill
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
                  Tax Invoice
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* ── Mode Banner ──────────────────────────────────────────────────── */}
        <div
          className={`mb-5 rounded-xl border px-4 py-2.5 text-xs font-semibold flex items-center gap-2 ${
            isGst
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-orange-50 border-orange-200 text-orange-800"
          }`}
        >
          <span className="text-sm">{isGst ? "📄" : "🧾"}</span>
          {isGst
            ? "GST Mode — CGST/SGST/IGST will be calculated based on Place of Supply. Customer GSTIN." 
            : "Non-GST Mode — Simple cash memo with no tax breakdown. Prices are treated as inclusive MRP."}
        </div>

        <form onSubmit={submitOrder} className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* ── LEFT: Product Selector & Customer ───────────────────────── */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
            {/* Customer Details */}
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-zinc-700">
                  Customer Name
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-amber-500 min-h-[42px]"
                />
              </label>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-700">Phone</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={customerPhone}
                  maxLength={10}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-base sm:text-sm focus:outline-none transition-colors min-h-[42px] ${
                    customerStatus === "found"
                      ? "border-emerald-400 bg-emerald-50 focus:border-emerald-500"
                      : customerStatus === "new"
                      ? "border-blue-400 bg-blue-50 focus:border-blue-500"
                      : "border-zinc-300 focus:border-amber-500"
                  }`}
                />
                {customerStatus === "looking" && (
                  <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <span className="animate-spin inline-block">⏳</span> Looking up customer…
                  </p>
                )}
                {customerStatus === "found" && (
                  <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    ✅ Customer found — details auto-filled!
                  </p>
                )}
                {customerStatus === "new" && (
                  <p className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                    🆕 New customer — will be saved after billing.
                  </p>
                )}
              </div>
            </div>

            {/* GST-only fields: State Code + GSTIN */}
            {isGst && (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-zinc-700">
                  🗺️ State / Place of Supply
                  <select
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500 bg-white"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} – {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-zinc-700">
                  🔢 Customer GSTIN
                  <input
                    type="text"
                    placeholder="27AAAAA0000A1Z5"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    maxLength={15}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </label>
              </div>
            )}

            {/* Delivery address */}
            <label className="text-xs font-semibold text-zinc-700 block">
              📍 Delivery Address{!isGst && " (Optional)"}
              <textarea
                rows={2}
                placeholder="Shop No. 5, Market Street, Pune 411001"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none"
              />
            </label>

            {/* Product Search & Barcode Scan */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-700">
                  🔍 Search Products / Barcodes
                </label>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Scanner Gun Ready
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type product name or scan barcode…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="flex items-center gap-1.5 shrink-0 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Scan barcode with device camera"
                >
                  <span>📷</span>
                  <span className="hidden sm:inline">Scan Barcode</span>
                </button>
              </div>

              {/* Non-GST Two Tech Ideas Filter */}
              {!isGst && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mr-1">
                    Non-GST Category:
                  </span>
                  <button
                    type="button"
                    onClick={() => setNonGstCategoryFilter("ALL")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      nonGstCategoryFilter === "ALL"
                        ? "bg-zinc-900 text-white shadow"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    🌟 All
                  </button>
                  <button
                    type="button"
                    onClick={() => setNonGstCategoryFilter("BAG")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      nonGstCategoryFilter === "BAG"
                        ? "bg-amber-500 text-zinc-950 font-black shadow"
                        : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    <span>🎒 Bag Count (25kg–50kg)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNonGstCategoryFilter("PACKET")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      nonGstCategoryFilter === "PACKET"
                        ? "bg-orange-600 text-white font-black shadow"
                        : "bg-orange-50 text-orange-900 border border-orange-200 hover:bg-orange-100"
                    }`}
                  >
                    <span>⚖️ Packet Count (250g, 500g, 1kg, 5kg)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Product Grid */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Available Products
                </h2>
                <span className="text-[10px] text-zinc-400">{filteredProducts.length} items</span>
              </div>
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-zinc-400 py-4 text-center">No products found.</p>
              ) : (
                filteredProducts.map((product) => {
                  const bagW = product.bagWeight && product.bagWeight > 0 ? product.bagWeight : 30;
                  const bagPrice = getProductBagPrice(product, isGst ? "GST" : "NON_GST");
                  const kgPrice = getProductKgPrice(product, isGst ? "GST" : "NON_GST");
                  const defaultCat = getDefaultNonGstCategory(product.counterPrice ?? product.price, product.unit);
                  const nonGstVariants = getProductWeightVariants(product, false).filter((v) => !v.isBag);

                  const bagVariant: WeightVariant = {
                    id: `${bagW}kg_bag`,
                    label: `🎒 1 Bag (${bagW} kg)`,
                    shortLabel: `1 Bag (${bagW}kg)`,
                    multiplier: 1.0,
                    isRetailUnit: false,
                    isBag: true,
                  };

                  const bagCartItem = cartItems.find((i) => i.productId === `${product.id}-${bagW}kg_bag`);
                  const itemsInCartForProduct = cartItems.filter((i) => i.productId.startsWith(product.id));
                  const totalItemsInCart = itemsInCartForProduct.reduce((sum, i) => sum + i.quantity, 0);
                  const outOfStock = product.stock <= 0;

                  return (
                    <div
                      key={product.id}
                      className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 shadow-xs hover:border-amber-400 transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-zinc-800 text-sm truncate">{product.name}</p>
                          <p className="text-xs text-zinc-500">
                            {isGst ? (
                              <span>
                                {formatCurrency(bagPrice)} / Bag ({bagW}kg)
                                <span className="ml-2 text-emerald-600 font-semibold">
                                  GST {product.gstRate || 5}%
                                </span>
                              </span>
                            ) : (
                              <span>
                                Base {formatCurrency(product.counterPrice ?? product.price)} / {product.unit || "kg"}
                              </span>
                            )}
                            <span
                              className={`ml-2 font-semibold ${
                                product.stock <= 5 ? "text-red-600" : "text-zinc-500"
                              }`}
                            >
                              · Stock: {product.stock} {isGst ? "bags" : (product.unit || "kg")}
                            </span>
                          </p>
                        </div>

                        {totalItemsInCart > 0 && (
                          <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 shadow-2xs">
                            🛒 {totalItemsInCart} in bill
                          </span>
                        )}
                      </div>

                      {/* Mode-Specific Actions */}
                      <div className="pt-2 border-t border-zinc-200/60 flex flex-col gap-2">
                        {isGst ? (
                          /* GST Mode: Strictly Wholesale Bag Count */
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-extrabold text-zinc-800 flex items-center gap-1">
                                <span>🎒</span> 1 Wholesale Bag ({bagW}kg)
                              </span>
                              <p className="text-[11px] font-medium text-emerald-700">
                                {formatCurrency(bagPrice)} + GST {product.gstRate || 5}%
                              </p>
                            </div>

                            <button
                              type="button"
                              disabled={outOfStock}
                              onClick={() => addItemToCart(product.id, 1, bagVariant)}
                              className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:bg-zinc-300 disabled:cursor-not-allowed transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                            >
                              <span>+ Add 1 Bag</span>
                              {bagCartItem && (
                                <span className="bg-emerald-800 text-white rounded-full px-1.5 py-0.2 text-[10px]">
                                  ({bagCartItem.quantity})
                                </span>
                              )}
                            </button>
                          </div>
                        ) : (
                          /* Non-GST Mode: Dual Categories (Bag Count + Packet Count) */
                          <div className="space-y-2">
                            {/* Category 1: Bag Count */}
                            <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50/80 border border-amber-200/80">
                              <div>
                                <span className="text-xs font-black text-amber-950 flex items-center gap-1">
                                  <span>🎒</span> 1 Bag ({bagW}kg) · ₹{bagPrice}
                                </span>
                                {defaultCat === "BAG" && (
                                  <span className="text-[9px] font-extrabold text-amber-800">
                                    ✨ Suggested Wholesale (≥ ₹900)
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                disabled={outOfStock}
                                onClick={() => addItemToCart(product.id, 1, bagVariant)}
                                className="rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/40 px-3 py-1 text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1.5"
                              >
                                <span>+ 1 Bag</span>
                                {bagCartItem && (
                                  <span className="bg-amber-500 text-zinc-950 rounded-full px-1.5 py-0.2 text-[10px] font-black">
                                    {bagCartItem.quantity}
                                  </span>
                                )}
                              </button>
                            </div>

                            {/* Category 2: Packet Count */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">
                                  ⚖️ Packet Units:
                                </span>
                                <span className="text-[10px] text-zinc-400">₹{kgPrice}/kg</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {nonGstVariants.map((v) => {
                                  const childVariant = product.variants?.find((cv) =>
                                    cv.unit?.toLowerCase() === v.id.toLowerCase() ||
                                    (v.id === "500g" && (cv.unit === "500g" || cv.unit === "500gm")) ||
                                    (v.id === "250g" && (cv.unit === "250g" || cv.unit === "250gm")) ||
                                    (v.id === "5kg" && cv.unit === "5kg")
                                  );
                                  const vPrice = childVariant
                                    ? (childVariant.counterPrice ?? childVariant.price)
                                    : calculateVariantPrice(kgPrice, v);

                                  const vItemId = childVariant ? childVariant.id : `${product.id}-${v.id}`;
                                  const vCartItem = cartItems.find((i) => i.productId === vItemId);

                                  return (
                                    <button
                                      key={v.id}
                                      type="button"
                                      disabled={outOfStock}
                                      onClick={() => addItemToCart(product.id, 1, v)}
                                      className="rounded-lg px-2.5 py-1 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer bg-white text-orange-950 border border-orange-200 hover:bg-orange-100 disabled:opacity-40"
                                      title={`Add ${v.label} for ₹${vPrice}`}
                                    >
                                      <span>{v.shortLabel}</span>
                                      <span className="text-[10px] text-orange-700 font-extrabold">₹{vPrice}</span>
                                      {vCartItem && (
                                        <span className="bg-orange-600 text-white rounded-full px-1.5 py-0.2 text-[9px] font-black">
                                          {vCartItem.quantity}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── RIGHT: Cart & Billing ────────────────────────────────────── */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2">
                <h2 className="text-sm font-bold text-zinc-800">Bill Items</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isGst
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-orange-100 text-orange-800"
                  }`}
                >
                  {cartItems.length} item(s) · {isGst ? "GST" : "Non-GST"}
                </span>
              </div>

              {cartItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400">
                  🛒 Cart is empty. Tap items on the left to build the bill.
                </div>
              ) : (
                <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {cartItems.map((item) => (
                    <li
                      key={item.productId}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-zinc-800 truncate">{item.name}</p>
                          {isGst && (
                            <p className="text-[10px] text-zinc-400">
                              HSN: {item.hsnCode} · GST {item.gstRate}%
                            </p>
                          )}
                        </div>

                        {/* Qty */}
                        <input
                          type="number"
                          step={isGst ? "1" : "0.01"}
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemQty(
                              item.productId,
                              isGst
                                ? Math.max(1, parseInt(e.target.value) || 0)
                                : parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-14 rounded-lg border border-zinc-300 px-1.5 py-1 text-center text-xs font-bold focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-zinc-500 font-semibold">{isGst ? (item.quantity === 1 ? "Bag" : "Bags") : item.unit}</span>

                        {/* Price override */}
                        <div className="flex items-center gap-0.5">
                          <span className="text-zinc-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(e) =>
                              updateItemPrice(item.productId, Number(e.target.value))
                            }
                            className="w-16 rounded-lg border border-zinc-300 px-1.5 py-1 text-center text-xs font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <span className="font-bold text-zinc-900 w-16 text-right">
                          ₹{(item.price * item.quantity).toFixed(0)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="text-red-400 hover:text-red-600 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ── Bottom Controls ────────────────────────────────────────── */}
            <div className="mt-4 border-t border-zinc-100 pt-4 space-y-3">
              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  💳 Payment Mode
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { value: "Cash", label: "💵 Cash" },
                    { value: "UPI", label: "📱 UPI" },
                    { value: "Card", label: "💳 Card" },
                    { value: "Credit", label: "📒 Credit" },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setPaymentMode(mode.value)}
                      className={`rounded-lg py-1.5 text-xs font-bold border transition-colors ${
                        paymentMode === mode.value
                          ? isGst
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-orange-500 border-orange-500 text-white"
                          : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-amber-400"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount (shown in both modes) */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-zinc-700 shrink-0">
                  Discount (₹):
                </label>
                <input
                  type="number"
                  min="0"
                  max={grossTotal}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-right font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Festival order, home delivery..."
                  className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Bill Total Summary */}
              <div
                className={`rounded-xl border p-3.5 space-y-1 ${
                  isGst
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-orange-50 border-orange-200"
                }`}
              >
                <div
                  className={`flex justify-between text-xs ${isGst ? "text-emerald-800" : "text-orange-800"}`}
                >
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                {isGst && (
                  <div className="flex justify-between text-xs text-emerald-800">
                    <span>
                      {stateCode === "37" ? "CGST + SGST" : "IGST"} (Est.):
                    </span>
                    <span className="font-semibold">{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div
                    className={`flex justify-between text-xs ${isGst ? "text-emerald-700" : "text-orange-700"}`}
                  >
                    <span>Discount:</span>
                    <span className="font-semibold text-red-600">
                      − {formatCurrency(discountAmount)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex items-center justify-between border-t pt-1 ${isGst ? "border-emerald-200" : "border-orange-200"}`}
                >
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${isGst ? "text-emerald-900" : "text-orange-900"}`}
                  >
                    Total Payable
                  </span>
                  <span
                    className={`text-xl font-black ${isGst ? "text-emerald-900" : "text-orange-900"}`}
                  >
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || cartItems.length === 0}
                className={`w-full rounded-xl py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-300 transition-colors shadow-sm ${
                  isGst
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                {submitting
                  ? "Processing..."
                  : isGst
                  ? "📄 Generate GST Bill & Print"
                  : "🧾 Generate Cash Memo & Print"}
              </button>

              {message && (
                <p
                  className={`rounded-lg p-2.5 text-xs font-bold text-center ${
                    message.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-600 border border-red-200"
                  }`}
                >
                  {message.text}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* ════════════════════════ RECEIPT MODAL ════════════════════════════ */}
      {showReceipt && completedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-zinc-900 px-5 py-3 print:hidden">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${
                    completedBill.billMode === "GST"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                  }`}
                >
                  {completedBill.billMode === "GST" ? "📄 GST TAX INVOICE" : "🧾 NON-GST CASH MEMO"}
                </span>
                <span className="text-sm font-bold text-zinc-100">
                  Bill #{completedBill.orderNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-600"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Printable Receipt */}
            <div
              id="worker-bill-receipt"
              className="flex-1 overflow-y-auto bg-white p-5 text-black font-mono text-xs print:overflow-visible print:p-3"
            >
              {/* Shop Header */}
              <div className="text-center border-b-2 border-black pb-3 mb-3">
                <h1 className="text-base font-extrabold uppercase">
                  Radhe Wholesale &amp; Retail Traders
                </h1>
                <p className="text-[10px] text-zinc-600">
                  123 Commercial Market Yard, Mumbai, Maharashtra
                </p>
                {completedBill.billMode === "GST" ? (
                  <p className="text-[10px] text-zinc-600">
                    Phone: +91 9876543210 | GSTIN: 27AAAAA0000A1Z5
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-600">Phone: +91 9876543210</p>
                )}
                <div
                  className={`mt-1.5 inline-block rounded px-3 py-0.5 text-[11px] font-extrabold ${
                    completedBill.billMode === "GST"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-orange-100 text-orange-800"
                  }`}
                >
                  {completedBill.billMode === "GST" ? "TAX INVOICE" : "CASH MEMO / RETAIL BILL"}
                </div>
              </div>

              {/* Bill Meta */}
              <div className="mb-3 space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="font-bold">Bill No:</span>
                  <span className="font-bold text-amber-700">#{completedBill.orderNumber}</span>
                </div>
                {completedBill.invoiceNumber && (
                  <div className="flex justify-between">
                    <span>Invoice #:</span>
                    <span className="font-mono font-bold text-emerald-700">{completedBill.invoiceNumber}</span>
                  </div>
                )}
                {completedBill.challanNumber && (
                  <div className="flex justify-between">
                    <span>Challan #:</span>
                    <span className="font-mono font-bold text-blue-700">{completedBill.challanNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Date &amp; Time:</span>
                  <span>{completedBill.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-semibold">{completedBill.customerName}</span>
                </div>
                {completedBill.customerPhone && (
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span>{completedBill.customerPhone}</span>
                  </div>
                )}
                {completedBill.gstNumber && (
                  <div className="flex justify-between">
                    <span>GSTIN:</span>
                    <span className="font-mono font-bold">{completedBill.gstNumber}</span>
                  </div>
                )}
                {completedBill.billMode === "GST" && (
                  <div className="flex justify-between">
                    <span>Place of Supply:</span>
                    <span className="font-semibold">{completedBill.placeOfSupply}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span className="font-bold">{completedBill.paymentMode}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse border-t-2 border-b border-black text-[10px] mb-3">
                <thead>
                  <tr className="border-b border-black">
                    <th className="py-1 text-left">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    {completedBill.billMode === "GST" && (
                      <th className="py-1 text-right">GST%</th>
                    )}
                    <th className="py-1 text-right">Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {completedBill.items.map((item, idx) => {
                    const itemGst = completedBill.billMode === "GST"
                      ? item.price * item.quantity * ((item.gstRate || 5) / 100)
                      : 0;
                    const itemTotal = item.price * item.quantity + itemGst;
                    return (
                      <tr key={idx} className="border-b border-dashed border-zinc-300">
                        <td className="py-1 font-semibold">{item.name}</td>
                        <td className="py-1 text-center">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-1 text-right">₹{item.price.toFixed(2)}</td>
                        {completedBill.billMode === "GST" && (
                          <td className="py-1 text-right text-zinc-500">
                            {item.gstRate}%
                          </td>
                        )}
                        <td className="py-1 text-right font-bold">
                          ₹{itemTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div className="space-y-0.5 border-b-2 border-black pb-3 mb-3 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{completedBill.subtotal.toFixed(2)}</span>
                </div>
                {completedBill.billMode === "GST" && (
                  <div className="flex justify-between text-zinc-600">
                    <span>
                      {completedBill.stateCode === "37" ? "CGST + SGST" : "IGST"}:
                    </span>
                    <span>₹{completedBill.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {completedBill.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span>− ₹{completedBill.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold border-t border-black pt-1 mt-1">
                  <span>TOTAL PAYABLE:</span>
                  <span>₹{completedBill.grandTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Paid ({completedBill.paymentMode}):</span>
                  <span>₹{completedBill.grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-[10px] text-zinc-500 space-y-0.5">
                {completedBill.billMode === "GST" ? (
                  <>
                    <p className="font-bold text-black">For Radhe Wholesale &amp; Retail Traders</p>
                    <p className="mt-3 border-t border-zinc-300 pt-1">Authorized Signatory</p>
                    <p>GSTIN: 27AAAAA0000A1Z5</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-black">🙏 Thank you for your purchase!</p>
                    <p>Goods once sold will not be taken back.</p>
                    <p className="text-[9px] italic">
                      This is a cash memo. Not valid for GST input credit.
                    </p>
                    <p>UPI: radhetraders@sbi</p>
                  </>
                )}
                {completedBill.notes && (
                  <p className="mt-1 italic text-zinc-400">Note: {completedBill.notes}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Shop Counter Barcode Scanner"
        subtitle="Align product barcode in camera or scan with barcode gun — price auto-syncs to bill"
      />

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body > * { display: none !important; }
          #worker-bill-receipt { display: block !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
