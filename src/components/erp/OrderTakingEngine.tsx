"use client";

import { useState, useEffect } from "react";
import { getProductWeightVariants, calculateVariantPrice, formatVariantProductName } from "@/lib/types";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  counterPrice?: number | null;
  counterGstPrice?: number | null;
  stock: number;
  unit: string;
  hsnCode: string;
  gstRate: number;
  bagWeight?: number | null;
  batchNumber?: string;
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

interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  stateCode: string;
  gstNumber?: string;
}

interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

interface OrderTakingEngineProps {
  onOrderCreated: (order: any) => void;
  onOpenPrintModal: (documentData: any) => void;
}

export function OrderTakingEngine({ onOrderCreated, onOpenPrintModal }: OrderTakingEngineProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Customer fields
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerStateCode, setCustomerStateCode] = useState("27");
  const [gstNumber, setGstNumber] = useState("");
  const [customerStatus, setCustomerStatus] = useState<"idle" | "looking" | "found" | "new">("idle");

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products?active=true&orderType=WALK_IN_GST");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/erp/customers");
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  // Phone auto-fill — looks up customer when 10 digits entered
  useEffect(() => {
    const phone = customerPhone.trim();
    if (phone.length < 10) { setCustomerStatus("idle"); return; }
    setCustomerStatus("looking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/erp/customers?phone=${encodeURIComponent(phone)}`);
        const data = await res.json();
        const cust = data.customer;
        if (cust) {
          setCustomerName(cust.name || "");
          setDeliveryAddress(cust.address || "");
          setCustomerStateCode(cust.stateCode || "27");
          setGstNumber(cust.gstNumber || "");
          setSelectedCustomer(cust);
          setCustomerStatus("found");
        } else {
          setSelectedCustomer(null);
          setCustomerStatus("new");
        }
      } catch { setCustomerStatus("new"); }
    }, 500);
    return () => clearTimeout(t);
  }, [customerPhone]);

  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone);
    setDeliveryAddress(cust.address || "");
    setCustomerStateCode(cust.stateCode || "27");
    setGstNumber(cust.gstNumber || "");
    setCustomerStatus("found");
  };

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          product,
          quantity: 1,
          unitPrice: product.price,
          discountPercent: 0,
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
    } else {
      setCart((prev) =>
        prev.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item))
      );
    }
  };

  const handleUpdatePrice = (productId: string, price: number) => {
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, unitPrice: price } : item))
    );
  };

  // Calculations
  const isInterState = customerStateCode.trim() !== "37";
  const isGstBill = Boolean(gstNumber.trim().length >= 5 || (selectedCustomer && selectedCustomer.gstNumber));
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const estimatedTax = cart.reduce((sum, item) => {
    const gross = item.quantity * item.unitPrice;
    return sum + gross * ((item.product.gstRate || 5) / 100);
  }, 0);
  const grandTotal = Math.round(subtotal + estimatedTax);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      alert("Please add at least one product to the order.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/erp/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer?.id,
          customerName: customerName || "Counter Sale",
          customerPhone,
          deliveryAddress,
          customerStateCode,
          gstNumber,
          orderType: "WALK_IN",
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discountPercent: i.discountPercent,
          })),
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      onOrderCreated(data.order);

      // Trigger Print Modal for immediate Order Confirmation Slip
      onOpenPrintModal({
        type: "ORDER_SLIP",
        orderNumber: data.order.orderNumber,
        invoiceNumber: data.invoice?.invoiceNumber,
        challanNumber: data.challan?.challanNumber,
        date: data.order.createdAt,
        customer: {
          name: data.order.customerName,
          phone: data.order.customerPhone,
          address: data.order.deliveryAddress,
          gstNumber: data.order.gstNumber,
        },
        items: data.order.items.map((i: any) => ({
          name: i.product?.name || "Item",
          hsnCode: i.hsnCode,
          batchNumber: i.batchNumber,
          quantity: i.quantity,
          unit: i.product?.unit || "kg",
          unitPrice: i.unitPrice,
          gstRate: i.gstRate,
          subtotal: i.subtotal,
        })),
        grandTotal: data.order.total,
      });

      // Reset Form
      setCart([]);
      setNotes("");
      setSelectedCustomer(null);
      setCustomerName("");
      setCustomerPhone("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return !(p as any).parentId;
    return (
      p.name.toLowerCase().includes(q) ||
      p.hsnCode.includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Product Catalog & Fast Search (7 cols) */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <span>🛒</span> Fast Item Selector
            </h3>
            <span className="text-xs text-zinc-500 font-mono">HSN / Category / Variant search</span>
          </div>

          <input
            type="text"
            placeholder="Search by product name, HSN code, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-base sm:text-sm min-h-[42px] focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredProducts.map((product) => {
            const isGstBill = Boolean(gstNumber.trim().length >= 5 || (selectedCustomer && selectedCustomer.gstNumber));
            const availableVariants = getProductWeightVariants(product, isGstBill);

            return (
              <div
                key={product.id}
                className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-xs hover:border-amber-500 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-zinc-900 text-sm leading-snug">{product.name}</h4>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-600 shrink-0">
                      HSN {product.hsnCode}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{product.category} • GST {product.gstRate}%</p>
                </div>

                {/* Package Variants Selection UI */}
                <div className="mt-2 pt-2 border-t border-zinc-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      {isGstBill ? "Wholesale Pack:" : "Select Pack (GST / Non-GST):"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {availableVariants.map((v) => {
                      const childVariant = (product as any).variants?.find((cv: any) =>
                        cv.unit?.toLowerCase() === v.id.toLowerCase() ||
                        (v.id === "500g" && (cv.unit === "500g" || cv.unit === "500gm")) ||
                        (v.id === "250g" && (cv.unit === "250g" || cv.unit === "250gm"))
                      );
                      const basePrice = isGstBill ? (product.counterGstPrice ?? product.price) : (product.counterPrice ?? product.price);
                      const variantPrice = childVariant
                        ? (isGstBill ? (childVariant.counterGstPrice ?? childVariant.price) : (childVariant.counterPrice ?? childVariant.price))
                        : calculateVariantPrice(basePrice, v);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={product.stock <= 0}
                          onClick={() => {
                            const variantProduct: Product = {
                              ...product,
                              id: childVariant ? childVariant.id : `${product.id}-${v.id}`,
                              name: childVariant ? childVariant.name : formatVariantProductName(product.name, v, product.bagWeight || 30),
                              price: variantPrice,
                              unit: v.shortLabel,
                            };
                            handleAddToCart(variantProduct);
                          }}
                          className={`rounded-md px-2 py-1 text-[11px] font-bold transition flex items-center gap-1 ${
                            v.isBag
                              ? "bg-zinc-900 text-amber-400 border border-amber-500/50 hover:bg-zinc-800"
                              : "bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={`Add ${v.label} for ₹${variantPrice}`}
                        >
                          <span>{v.shortLabel}</span>
                          <span className="text-[10px] opacity-85">₹{variantPrice}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {(() => {
                  const is3in1 = product.availability === "BOTH" || product.unit?.toLowerCase() === "bag" || product.unit?.toLowerCase() === "bags";
                  const displayPrice = (isGstBill && !is3in1) ? (product.price * (product.bagWeight || 30)).toFixed(0) : product.price;
                  const displayUnit = (is3in1 || isGstBill) ? "Bag" : (product.unit || "kg");
                  return (
                    <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2">
                      <span className="text-sm font-extrabold text-amber-700">
                        ₹{displayPrice}{" "}
                        <span className="text-[10px] text-zinc-400">/{displayUnit}</span>
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          product.stock <= 20 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        Stock: {product.stock} {displayUnit === "Bag" ? "bags" : (product.unit || "kg")}
                      </span>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Customer & Billing Desk (5 cols) */}
      <div className="lg:col-span-5 flex flex-col space-y-4">
        {/* Customer Selection Card */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <span>👤</span> Customer & Place of Supply
          </h3>

          <div className="flex gap-2">
            <select
              onChange={(e) => {
                const found = customers.find((c) => c.id === e.target.value);
                if (found) handleSelectCustomer(found);
              }}
              className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-800 focus:outline-none"
            >
              <option value="">-- Quick Select Saved Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) - {c.stateCode}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <input
              type="text"
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-base sm:text-xs min-h-[40px]"
            />
            <div className="flex flex-col gap-0.5">
              <input
                type="tel"
                placeholder="Phone (10 digits)"
                value={customerPhone}
                maxLength={10}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                className={`rounded-lg border px-3 py-1.5 text-base sm:text-xs min-h-[40px] transition-colors ${
                  customerStatus === "found"
                    ? "border-emerald-400 bg-emerald-50"
                    : customerStatus === "new"
                    ? "border-blue-400 bg-blue-50"
                    : "border-zinc-300"
                }`}
              />
              {customerStatus === "looking" && <p className="text-[10px] text-zinc-400">⏳ Looking up…</p>}
              {customerStatus === "found" && <p className="text-[10px] font-semibold text-emerald-700">✅ Customer found!</p>}
              {customerStatus === "new" && <p className="text-[10px] font-semibold text-blue-600">🆕 New customer</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 uppercase">State Code (POS)</label>
              <select
                value={customerStateCode}
                onChange={(e) => setCustomerStateCode(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-2 py-1 text-base sm:text-xs min-h-[40px]"
              >
                <option value="27">27 - Maharashtra (Intra-State)</option>
                <option value="24">24 - Gujarat (Inter-State)</option>
                <option value="07">07 - Delhi (Inter-State)</option>
                <option value="29">29 - Karnataka (Inter-State)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 uppercase">GSTIN (Optional)</label>
              <input
                type="text"
                placeholder="27AAAAA0000A1Z5"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-2 py-1 text-base sm:text-xs min-h-[40px] font-mono"
              />
            </div>
          </div>
        </div>

        {/* Cart Itemized Desk */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
              <h3 className="text-sm font-bold text-zinc-900">Current Order Items ({cart.length})</h3>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${isInterState ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                {isInterState ? "IGST Tax Applicable" : "CGST + SGST Applicable"}
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2">
              {cart.length === 0 ? (
                <p className="text-center text-xs text-zinc-400 py-6">No items added yet. Click on products to add.</p>
              ) : (
                cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 text-xs gap-2">
                    <div className="flex-1 min-w-0 pr-1">
                      <p className="font-bold text-zinc-900 truncate">{item.product.name}</p>
                      <p className="text-[10px] text-zinc-500">HSN: {item.product.hsnCode} • GST {item.product.gstRate}%</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min="1"
                        step={isGstBill ? "1" : "1"}
                        value={item.quantity}
                        onChange={(e) => handleUpdateQuantity(item.productId, Number(e.target.value))}
                        className="w-12 sm:w-14 text-center rounded border border-zinc-300 py-1 font-bold min-h-[34px]"
                      />
                      <span className="font-semibold text-zinc-500 text-[11px]">{isGstBill ? (item.quantity === 1 ? "Bag" : "Bags") : "kg"}</span>
                      <span className="font-semibold text-zinc-700 text-xs">₹{(item.quantity * item.unitPrice).toFixed(0)}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.productId, 0)}
                        className="text-red-500 hover:text-red-700 text-sm font-bold p-1 rounded hover:bg-red-50 transition"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Summary & Action Buttons */}
          <div className="border-t border-zinc-200 pt-3 space-y-2 mt-4">
            <div className="space-y-1 text-xs text-zinc-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Est. GST ({isInterState ? "IGST" : "CGST+SGST"}):</span>
                <span className="font-semibold">₹{estimatedTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-zinc-900 pt-1 border-t border-zinc-200">
                <span>Grand Total:</span>
                <span className="text-amber-700">₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting || cart.length === 0}
              className="w-full rounded-xl bg-amber-500 py-3 min-h-[48px] text-sm font-bold text-zinc-950 shadow-md hover:bg-amber-400 disabled:opacity-50 transition flex items-center justify-center"
            >
              {isSubmitting ? "Generating Slip..." : "⚡ Generate Order Acknowledgment Slip"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
