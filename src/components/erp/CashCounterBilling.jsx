"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { getProductWeightVariants, calculateVariantPrice, formatVariantProductName, getProductBagPrice, getProductKgPrice, getDefaultNonGstCategory, } from "@/lib/types";
const BarcodeScannerModal = dynamic(() => import("@/components/BarcodeScannerModal").then((mod) => mod.BarcodeScannerModal), { ssr: false });
const PAYMENT_MODES = [
    { value: "CASH", label: "💵 Cash", color: "bg-emerald-500 text-white" },
    { value: "UPI", label: "📱 UPI", color: "bg-violet-500 text-white" },
    { value: "CARD", label: "💳 Card", color: "bg-blue-500 text-white" },
    { value: "CREDIT", label: "📒 Credit", color: "bg-amber-500 text-zinc-950" },
];
// ─── Component ────────────────────────────────────────────────────────────────
export function CashCounterBilling({ onOpenPrintModal }) {
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [packCategory, setPackCategory] = useState("ALL");
    const [cart, setCart] = useState([]);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerStatus, setCustomerStatus] = useState("idle");
    const [paymentMode, setPaymentMode] = useState("CASH");
    const [discountAmount, setDiscountAmount] = useState(0);
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recentBills, setRecentBills] = useState([]);
    const [activeView, setActiveView] = useState("POS");
    const [successBillNo, setSuccessBillNo] = useState(null);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanToast, setScanToast] = useState(null);
    // ── Data Fetching ─────────────────────────────────────────────────────────
    const fetchProducts = async () => {
        try {
            const res = await fetch("/api/products?active=true&orderType=WALK_IN_NONGST");
            const data = await res.json();
            setProducts(data.products || []);
        }
        catch (e) {
            console.error("Failed to load products", e);
        }
    };
    const fetchRecentBills = useCallback(async () => {
        try {
            const res = await fetch("/api/erp/cash-bills");
            const data = await res.json();
            setRecentBills(data.bills || []);
        }
        catch (e) {
            console.error("Failed to load recent bills", e);
        }
    }, []);
    useEffect(() => {
        fetchProducts();
        fetchRecentBills();
    }, [fetchRecentBills]);
    // Phone auto-fill — looks up customer when 10 digits entered
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
                    setCustomerStatus("found");
                }
                else {
                    setCustomerStatus("new");
                }
            }
            catch {
                setCustomerStatus("new");
            }
        }, 500);
        return () => clearTimeout(t);
    }, [customerPhone]);
    // ── Cart Operations ───────────────────────────────────────────────────────
    const addToCart = (product, customPrice) => {
        const effectivePrice = customPrice ?? product.counterPrice ?? product.price;
        setCart((prev) => {
            const exists = prev.find((i) => i.productId === product.id);
            if (exists) {
                return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { productId: product.id, product, quantity: 1, unitPrice: effectivePrice }];
        });
    };
    // ── Barcode Scan Handler with Auto Price Sync ──────────────────────────────
    const handleBarcodeScanned = useCallback((barcode) => {
        const clean = barcode.trim().toLowerCase();
        const product = products.find((p) => (p.barcode && p.barcode.toLowerCase() === clean) ||
            p.id.toLowerCase() === clean ||
            p.name.toLowerCase() === clean);
        if (!product) {
            alert(`❌ Barcode "${barcode}" not found in inventory.`);
            return;
        }
        addToCart(product);
        const effectivePrice = product.counterPrice ?? product.price;
        setScanToast(`✅ Scanned: ${product.name} — Synced Price: ₹${effectivePrice} added!`);
        setTimeout(() => setScanToast(null), 3500);
    }, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products]);
    // Background listener for physical USB/Bluetooth Barcode Scanner Guns
    useEffect(() => {
        let buffer = "";
        let lastKeyTime = Date.now();
        const handleKeyDown = (e) => {
            const target = e.target;
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
            }
            else if (e.key.length === 1) {
                if (diff > 80) {
                    buffer = e.key;
                }
                else {
                    buffer += e.key;
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleBarcodeScanned]);
    const updateQty = (productId, qty) => {
        if (qty <= 0) {
            setCart((prev) => prev.filter((i) => i.productId !== productId));
        }
        else {
            setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
        }
    };
    const updatePrice = (productId, price) => {
        setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, unitPrice: price } : i)));
    };
    const clearCart = () => {
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerStatus("idle");
        setDiscountAmount(0);
        setNotes("");
        setPaymentMode("CASH");
        setSuccessBillNo(null);
    };
    // ── Calculations ──────────────────────────────────────────────────────────
    const grossTotal = cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const netPayable = Math.max(0, grossTotal - discountAmount);
    // ── Submit Bill ───────────────────────────────────────────────────────────
    const handleSaveBill = async (andPrint = false) => {
        if (cart.length === 0) {
            alert("Please add at least one item to the bill.");
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/erp/cash-bills", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerName: customerName || "Counter Sale",
                    customerPhone,
                    paymentMode,
                    items: cart.map((i) => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        unitPrice: i.unitPrice,
                    })),
                    discountAmount,
                    notes,
                }),
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error || "Failed to save bill");
            setSuccessBillNo(data.bill.billNumber);
            fetchRecentBills();
            if (andPrint) {
                // Trigger print modal with CASH_MEMO type
                onOpenPrintModal({
                    type: "CASH_MEMO",
                    billNumber: data.bill.billNumber,
                    date: data.bill.date,
                    paymentMode: data.bill.paymentMode,
                    customer: {
                        name: data.bill.customerName,
                        phone: data.bill.customerPhone || "",
                    },
                    items: data.bill.items.map((i) => ({
                        name: i.name,
                        quantity: i.quantity,
                        unit: i.unit,
                        unitPrice: i.unitPrice,
                        subtotal: i.subtotal,
                    })),
                    grossTotal: data.bill.grossTotal,
                    discountAmount: data.bill.discountAmount,
                    grandTotal: data.bill.netTotal,
                    notes: data.bill.notes,
                });
            }
            clearCart();
        }
        catch (e) {
            alert(e.message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    // ── Filtered Products ─────────────────────────────────────────────────────
    const filteredProducts = products.filter((p) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q
            ? !p.parentId
            : p.name.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                (p.barcode && p.barcode.toLowerCase().includes(q));
        if (!matchesSearch)
            return false;
        if (packCategory === "BAG") {
            const isBagUnit = p.unit?.toLowerCase() === "bag" || p.unit?.toLowerCase() === "bags";
            const is3in1 = p.availability === "BOTH";
            const hasBagWeight = (p.bagWeight && p.bagWeight > 0) || (p.counterPrice ?? p.price) >= 900;
            return isBagUnit || is3in1 || hasBagWeight;
        }
        if (packCategory === "PACKET") {
            const isBagUnit = p.unit?.toLowerCase() === "bag" || p.unit?.toLowerCase() === "bags";
            return !isBagUnit || (p.variants && p.variants.length > 0) || Boolean(p.bagWeight && p.bagWeight > 0);
        }
        return true;
    });
    // ─────────────────────────────────────────────────────────────────────────
    return (<div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800 p-5 shadow-xl text-white">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-orange-500/20 border border-orange-500/40 px-3 py-0.5 text-xs font-bold text-orange-400">
              NON-GST · CASH MEMO
            </span>
            <span className="text-[10px] font-mono text-zinc-400">Walk-in Counter POS</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">🏪 Cash Counter Billing</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Non-taxable counter sales · 🎒 Wholesale Bag Count (25kg–50kg) & ⚖️ Retail Packet Count (250g, 500g, 1kg, 5kg)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveView("POS")} className={`rounded-lg px-4 py-2 text-xs font-bold transition ${activeView === "POS"
            ? "bg-orange-500 text-zinc-950 shadow"
            : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}>
            🖊️ New Bill
          </button>
          <button onClick={() => { setActiveView("HISTORY"); fetchRecentBills(); }} className={`rounded-lg px-4 py-2 text-xs font-bold transition ${activeView === "HISTORY"
            ? "bg-orange-500 text-zinc-950 shadow"
            : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}>
            📋 Recent Bills ({recentBills.length})
          </button>
        </div>
      </div>

      {/* ── Success Banner ─────────────────────────────────────────────────── */}
      {successBillNo && (<div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-800 shadow-sm">
          <span className="text-xl">✅</span>
          <span>
            Bill <span className="font-extrabold text-emerald-700">#{successBillNo}</span> saved
            successfully!
          </span>
          <button onClick={() => setSuccessBillNo(null)} className="ml-auto text-emerald-500 hover:text-emerald-700">
            ✕
          </button>
        </div>)}

      {/* ── POS View ───────────────────────────────────────────────────────── */}
      {activeView === "POS" && (<div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Product Selector */}
          <div className="lg:col-span-7 space-y-4">
            {scanToast && (<div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-xs animate-in slide-in-from-top-1">
                <span className="flex items-center gap-2">
                  <span className="text-base">⚡</span>
                  <span>{scanToast}</span>
                </span>
                <button type="button" onClick={() => setScanToast(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">
                  ✕
                </button>
              </div>)}

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">🛒 Product Selector</h3>
                  <span className="text-[10px] text-zinc-400 font-mono">Two Tech Ideas: Bag Count & Packet Count</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                    Scanner Gun Ready
                  </span>
                  <button type="button" onClick={() => setScannerOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer" title="Open Camera Barcode Scanner">
                    <span>📷</span>
                    <span>Scan Barcode</span>
                  </button>
                </div>
              </div>

              <input type="text" placeholder="Search product name, category, or barcode…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-base sm:text-sm min-h-[42px] focus:border-orange-400 focus:outline-none"/>

              {/* Two Tech Ideas: Category Switcher */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-100">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mr-1">
                  Filter Category:
                </span>
                <button type="button" onClick={() => setPackCategory("ALL")} className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${packCategory === "ALL"
                ? "bg-zinc-900 text-white shadow"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>
                  🌟 All Items
                </button>
                <button type="button" onClick={() => setPackCategory("BAG")} className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${packCategory === "BAG"
                ? "bg-amber-500 text-zinc-950 font-black shadow"
                : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"}`}>
                  <span>🎒 Bag Count (25kg–50kg)</span>
                </button>
                <button type="button" onClick={() => setPackCategory("PACKET")} className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${packCategory === "PACKET"
                ? "bg-orange-600 text-white font-black shadow"
                : "bg-orange-50 text-orange-900 border border-orange-200 hover:bg-orange-100"}`}>
                  <span>⚖️ Packet Count (250g, 500g, 1kg, 5kg)</span>
                </button>
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (<div className="col-span-2 py-12 text-center text-sm text-zinc-400">
                  No products found matching category filter
                </div>) : (filteredProducts.map((product) => {
                const bagW = product.bagWeight && product.bagWeight > 0 ? product.bagWeight : 30;
                const effectiveBasePrice = product.counterPrice ?? product.price;
                const bagPrice = getProductBagPrice(product, "NON_GST");
                const kgPrice = getProductKgPrice(product, "NON_GST");
                const defaultCategory = getDefaultNonGstCategory(effectiveBasePrice, product.unit);
                const is3in1 = product.availability === "BOTH" || product.unit?.toLowerCase() === "bag" || product.unit?.toLowerCase() === "bags";
                const nonGstVariants = getProductWeightVariants(product, false).filter((v) => !v.isBag);
                const bagProduct = {
                    ...product,
                    id: `${product.id}-${bagW}kg_bag`,
                    name: `${product.name} (1 Bag - ${bagW}kg)`,
                    price: bagPrice,
                    counterPrice: bagPrice,
                    unit: `1 Bag (${bagW}kg)`,
                };
                return (<div key={product.id} className={`rounded-xl border bg-white p-3.5 shadow-xs transition-all flex flex-col justify-between group ${defaultCategory === "BAG"
                        ? "border-amber-300 hover:border-amber-500 hover:shadow-md"
                        : "border-zinc-200 hover:border-orange-400 hover:shadow-md"}`}>
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-zinc-900 text-sm leading-snug group-hover:text-orange-600 transition-colors">
                              {product.name}
                            </h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{product.category}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${product.stock <= 20
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-800"}`}>
                            {product.stock} {is3in1 ? "Bags" : product.unit}
                          </span>
                        </div>

                        {/* Smart Price Guidance */}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                            Billing Options:
                          </span>
                          {effectiveBasePrice >= 900 ? (<span className="text-[9px] font-black text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs">
                              🎒 Default Bag (≥ ₹900)
                            </span>) : (<span className="text-[9px] font-black text-orange-950 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded shadow-2xs">
                              ⚖️ Retail Packet Unit
                            </span>)}
                        </div>

                        {/* CATEGORY 1: WHOLESALE BAG COUNT (25kg - 50kg) */}
                        <div className="mt-2 p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-extrabold text-amber-950 flex items-center gap-1">
                              <span>🎒</span> 1 Bag ({bagW}kg)
                            </span>
                            <span className="font-black text-amber-900">
                              ₹{bagPrice}
                            </span>
                          </div>
                          <button type="button" onClick={() => addToCart(bagProduct, bagPrice)} className="w-full rounded-md bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/40 px-2.5 py-1 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98" title={`Add 1 Wholesale Bag of ${bagW}kg for ₹${bagPrice}`}>
                            <span>+ Add 1 Bag ({bagW}kg)</span>
                            <span className="text-[11px] opacity-85">· ₹{bagPrice}</span>
                          </button>
                        </div>

                        {/* CATEGORY 2: RETAIL PACKET COUNT (250g, 500g, 1kg, 5kg) */}
                        <div className="mt-2 pt-2 border-t border-zinc-100 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">
                              ⚖️ Packet Packs:
                            </span>
                            <span className="text-[10px] font-semibold text-zinc-500">
                              Base ₹{kgPrice}/kg
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {nonGstVariants.map((v) => {
                        const childVariant = product.variants?.find((cv) => cv.unit?.toLowerCase() === v.id.toLowerCase() ||
                            (v.id === "500g" && (cv.unit === "500g" || cv.unit === "500gm")) ||
                            (v.id === "250g" && (cv.unit === "250g" || cv.unit === "250gm")) ||
                            (v.id === "5kg" && cv.unit === "5kg"));
                        const variantPrice = childVariant
                            ? (childVariant.counterPrice ?? childVariant.price)
                            : calculateVariantPrice(kgPrice, v);
                        const variantProduct = {
                            ...product,
                            id: childVariant ? childVariant.id : `${product.id}-${v.id}`,
                            name: childVariant ? childVariant.name : formatVariantProductName(product.name, v, bagW),
                            price: variantPrice,
                            counterPrice: variantPrice,
                            unit: v.shortLabel,
                        };
                        return (<button key={v.id} type="button" onClick={() => addToCart(variantProduct, variantPrice)} className="rounded-md px-2 py-1 text-[11px] font-bold transition flex items-center gap-1 bg-orange-50 text-orange-950 border border-orange-200 hover:bg-orange-100 cursor-pointer active:scale-95 shadow-2xs" title={`Add ${v.label} for ₹${variantPrice}`}>
                                  <span>{v.shortLabel}</span>
                                  <span className="text-[10px] text-orange-700 font-black">₹{variantPrice}</span>
                                </button>);
                    })}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2">
                        <span className="text-xs font-bold text-zinc-600">
                          Quick Add:
                        </span>
                        <button type="button" onClick={() => {
                        if (defaultCategory === "BAG") {
                            addToCart(bagProduct, bagPrice);
                        }
                        else {
                            addToCart(product, kgPrice);
                        }
                    }} className="rounded-md bg-orange-100 border border-orange-300 px-2.5 py-0.5 text-[11px] font-bold text-orange-900 hover:bg-orange-500 hover:text-white transition-colors cursor-pointer">
                          + {defaultCategory === "BAG" ? `1 Bag (${bagW}kg)` : (product.unit || "1 kg")}
                        </button>
                      </div>
                    </div>);
            }))}
            </div>
          </div>

          {/* Right: Bill Desk */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Customer Details */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <span>👤</span> Customer Details
                <span className="ml-auto text-[10px] text-zinc-400 font-normal">Optional</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="text" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="sm:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-xs min-h-[40px] focus:border-orange-400 focus:outline-none"/>
                <div className="flex flex-col gap-0.5">
                  <input type="tel" placeholder="Mobile (10 digits)" value={customerPhone} maxLength={10} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))} className={`rounded-lg border px-3 py-2 text-base sm:text-xs min-h-[40px] focus:outline-none transition-colors ${customerStatus === "found"
                ? "border-emerald-400 bg-emerald-50"
                : customerStatus === "new"
                    ? "border-blue-400 bg-blue-50"
                    : "border-zinc-300 focus:border-orange-400"}`}/>
                  {customerStatus === "looking" && <p className="text-[10px] text-zinc-400">⏳ Looking up…</p>}
                  {customerStatus === "found" && <p className="text-[10px] font-semibold text-emerald-700">✅ Auto-filled!</p>}
                  {customerStatus === "new" && <p className="text-[10px] font-semibold text-blue-600">🆕 New customer</p>}
                </div>
                <input type="text" placeholder="Remarks / Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-xs min-h-[40px] focus:border-orange-400 focus:outline-none"/>
              </div>

              {/* Payment Mode */}
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1.5">
                  Payment Mode
                </p>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_MODES.map((mode) => (<button key={mode.value} onClick={() => setPaymentMode(mode.value)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-sm ${paymentMode === mode.value
                    ? mode.color + " ring-2 ring-offset-1 ring-orange-400 shadow-md"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>
                      {mode.label}
                    </button>))}
                </div>
              </div>
            </div>

            {/* Cart */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 mb-3">
                <h3 className="text-sm font-bold text-zinc-900">
                  Bill Items{" "}
                  <span className="ml-1 rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[10px] font-bold">
                    {cart.length}
                  </span>
                </h3>
                {cart.length > 0 && (<button onClick={clearCart} className="text-[10px] text-red-400 hover:text-red-600 font-semibold">
                    ✕ Clear All
                  </button>)}
              </div>

              {/* Cart Items */}
              <div className="flex-1 max-h-56 overflow-y-auto space-y-2">
                {cart.length === 0 ? (<div className="py-10 text-center text-xs text-zinc-400">
                    <div className="text-3xl mb-2">🛒</div>
                    Click products on the left to add them here
                  </div>) : (cart.map((item) => (<div key={item.productId} className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-zinc-900 truncate">{item.product.name}</p>
                        <p className="text-[10px] text-zinc-400">{item.product.category}</p>
                      </div>
                      {/* Qty */}
                      <input type="number" min="1" value={item.quantity} onChange={(e) => updateQty(item.productId, Number(e.target.value))} className="w-12 rounded border border-zinc-300 py-0.5 text-center font-bold text-xs"/>
                      <span className="text-zinc-400 text-[10px]">{item.product.unit}</span>
                      {/* Price Override */}
                      <div className="flex items-center gap-0.5">
                        <span className="text-zinc-400">₹</span>
                        <input type="number" min="0" value={item.unitPrice} onChange={(e) => updatePrice(item.productId, Number(e.target.value))} className="w-16 rounded border border-zinc-300 py-0.5 text-center font-mono text-xs"/>
                      </div>
                      {/* Row Total */}
                      <span className="w-16 text-right font-bold text-zinc-800 shrink-0">
                        ₹{(item.quantity * item.unitPrice).toFixed(0)}
                      </span>
                      <button onClick={() => updateQty(item.productId, 0)} className="text-red-400 hover:text-red-600 font-bold px-1 shrink-0">
                        ✕
                      </button>
                    </div>)))}
              </div>

              {/* Totals */}
              <div className="border-t border-zinc-200 pt-3 mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Gross Total:</span>
                  <span className="font-semibold">₹{grossTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-600">
                  <span>Discount (₹):</span>
                  <input type="number" min="0" max={grossTotal} value={discountAmount} onChange={(e) => setDiscountAmount(Number(e.target.value))} className="w-24 rounded border border-zinc-300 px-2 py-0.5 text-right font-mono text-xs"/>
                </div>
                <div className="flex justify-between text-base font-extrabold text-zinc-900 border-t border-zinc-200 pt-2">
                  <span>Net Payable:</span>
                  <span className="text-orange-600">₹{netPayable.toLocaleString("en-IN")}</span>
                </div>
                <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-semibold text-zinc-500">
                    {paymentMode}
                  </span>
                  <span>· Non-GST Cash Memo · Inclusive Pricing</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 space-y-2">
                <button onClick={() => handleSaveBill(true)} disabled={isSubmitting || cart.length === 0} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-md hover:bg-orange-400 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  🖨️{" "}
                  {isSubmitting ? "Saving…" : "Save & Print Cash Memo"}
                </button>
                <button onClick={() => handleSaveBill(false)} disabled={isSubmitting || cart.length === 0} className="w-full rounded-xl bg-zinc-800 py-2.5 text-sm font-bold text-zinc-100 hover:bg-zinc-700 active:scale-95 disabled:opacity-50 transition-all">
                  ✅ Save Only (No Print)
                </button>
              </div>
            </div>
          </div>
        </div>)}

      {/* ── History View ────────────────────────────────────────────────────── */}
      {activeView === "HISTORY" && (<div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-zinc-50">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Recent Cash Bills</h3>
              <p className="text-[10px] text-zinc-400 font-mono">
                Walk-in completed orders · Non-GST memos only
              </p>
            </div>
            <button onClick={fetchRecentBills} className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200">
              🔄 Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead className="bg-zinc-50 border-b border-zinc-200 uppercase text-zinc-500 font-semibold">
                <tr>
                  <th className="p-3">Bill #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Items</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentBills.length === 0 ? (<tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-400">
                      No cash bills yet. Create your first bill above.
                    </td>
                  </tr>) : (recentBills.map((bill) => {
                const noteMode = bill.notes?.match(/\[(\w+)\]/)?.[1] ?? "CASH";
                return (<tr key={bill.id} className="hover:bg-zinc-50 transition">
                        <td className="p-3 font-extrabold text-orange-600">
                          #{bill.orderNumber}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-zinc-900">
                            {bill.customerName || "Counter Sale"}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {bill.customerPhone || "—"}
                          </p>
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-zinc-700">
                            {bill.items?.length ?? 0} item(s)
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate max-w-[140px]">
                            {bill.items
                        ?.slice(0, 2)
                        .map((i) => i.product?.name)
                        .join(", ")}
                            {(bill.items?.length ?? 0) > 2 ? "…" : ""}
                          </p>
                        </td>
                        <td className="p-3 text-right font-extrabold text-zinc-900">
                          ₹{bill.total.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${noteMode === "UPI"
                        ? "bg-violet-100 text-violet-800"
                        : noteMode === "CARD"
                            ? "bg-blue-100 text-blue-800"
                            : noteMode === "CREDIT"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"}`}>
                            {noteMode}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-500">
                          {new Date(bill.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                        </td>
                        <td className="p-3 text-right">
                          <button onClick={() => onOpenPrintModal({
                        type: "CASH_MEMO",
                        billNumber: bill.orderNumber,
                        date: bill.createdAt,
                        paymentMode: noteMode,
                        customer: {
                            name: bill.customerName || "Counter Sale",
                            phone: bill.customerPhone || "",
                        },
                        items: (bill.items || []).map((i) => ({
                            name: i.product?.name || "Item",
                            quantity: i.quantity,
                            unit: "—",
                            unitPrice: i.unitPrice,
                            subtotal: i.quantity * i.unitPrice,
                        })),
                        grossTotal: bill.total,
                        discountAmount: 0,
                        grandTotal: bill.total,
                        notes: bill.notes,
                    })} className="rounded-lg bg-zinc-900 px-3 py-1.5 min-h-[36px] inline-flex items-center justify-center text-[11px] font-bold text-orange-400 hover:bg-zinc-700 transition">
                            🖨️ Reprint
                          </button>
                        </td>
                      </tr>);
            }))}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScanned} title="Cash Counter Barcode Scanner" subtitle="Align product barcode in camera or scan with barcode gun — price auto-syncs to bill"/>
    </div>);
}
