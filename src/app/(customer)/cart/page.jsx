"use client";
import { useCart } from "@/components/CartProvider";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { formatCurrency } from "@/lib/types";
import Link from "next/link";
export default function CartPage() {
    const { items, updateQuantity, clearCart, total } = useCart();
    const { user, openAuthModal } = useCustomerAuth();
    // If customer is not logged in, require mobile OTP login to access cart
    if (!user) {
        return (<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center max-w-lg mx-auto py-12">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-4xl shadow-xs border border-amber-200">
          🔒
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">Login Required to Access Cart</h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Please log in with your verified mobile number and OTP to add wholesale products to your cart and place orders.
        </p>
        <button type="button" onClick={() => openAuthModal("/cart")} className="mt-2 w-full sm:w-auto rounded-full bg-amber-600 px-8 py-3.5 text-sm sm:text-base font-bold text-white shadow-md hover:bg-amber-700 active:scale-95 transition-all min-h-[48px] flex items-center justify-center gap-2 cursor-pointer">
          <span>📱</span>
          <span>Login / Sign Up with Mobile OTP →</span>
        </button>
        <Link href="/products" className="text-xs font-bold text-amber-700 hover:underline pt-2">
          ← Browse Wholesale Products
        </Link>
      </div>);
    }
    if (items.length === 0) {
        return (<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-4xl shadow-xs">
          🛒
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">Your wholesale cart is empty</h1>
        <p className="max-w-md text-sm text-zinc-500 leading-relaxed">
          Browse our wholesale bags of sortex-clean dals, pulses, and grains from Vijayawada.
        </p>
        <Link href="/products" className="mt-2 rounded-full bg-amber-600 px-7 py-3 text-sm font-bold text-white shadow-md hover:bg-amber-700 active:scale-95 transition-all min-h-[44px] flex items-center justify-center">
          Browse Wholesale Products →
        </Link>
      </div>);
    }
    const totalBags = items.reduce((sum, item) => sum + item.quantity, 0);
    return (<div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">Shopping Cart</h1>
          <p className="text-xs sm:text-sm text-zinc-500">
            {totalBags} {totalBags === 1 ? "wholesale bag" : "wholesale bags"} ready for checkout
          </p>
        </div>
        <Link href="/products" className="text-xs sm:text-sm font-bold text-amber-700 hover:text-amber-800">
          + Add More Products
        </Link>
      </div>

      {/* Cart Items List — Responsive Cards on Mobile, Structured Rows on Desktop */}
      <div className="space-y-3 sm:space-y-4">
        {items.map((item) => (<div key={item.productId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-sm">
            {/* Product Thumbnail & Details */}
            <div className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 overflow-hidden">
                {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1"/>) : (<span className="text-2xl sm:text-3xl" aria-hidden="true">🌾</span>)}
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 leading-snug break-words">
                  {item.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span className="font-semibold text-amber-900">
                    {formatCurrency(item.price)}
                  </span>
                  <span>/ {item.unit || "Bag"}</span>
                  {item.gstRate && (<span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      GST {item.gstRate}%
                    </span>)}
                </div>
              </div>
            </div>

            {/* Quantity Stepper, Line Total, and Remove Button */}
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
              {/* Stepper */}
              <div className="flex items-center overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-xs">
                <button type="button" onClick={() => updateQuantity(item.productId, item.quantity - 1)} aria-label={`Decrease quantity of ${item.name}`} className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center text-lg font-black text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition cursor-pointer">
                  −
                </button>
                <span className="min-w-8 sm:min-w-10 px-2 text-center text-sm sm:text-base font-black text-zinc-900">
                  {item.quantity}
                </span>
                <button type="button" onClick={() => updateQuantity(item.productId, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label={`Increase quantity of ${item.name}`} className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center text-lg font-black text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 active:bg-zinc-200 transition cursor-pointer">
                  +
                </button>
              </div>

              {/* Line Total */}
              <div className="text-right min-w-[80px]">
                <p className="text-base sm:text-lg font-black text-amber-900 leading-tight">
                  {formatCurrency(item.price * item.quantity)}
                </p>
                <p className="text-[10px] text-zinc-400">Excl. GST</p>
              </div>

              {/* Remove Button */}
              <button type="button" onClick={() => updateQuantity(item.productId, 0)} aria-label={`Remove ${item.name} from cart`} className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:bg-red-50 hover:text-red-600 active:scale-95 transition" title="Remove item">
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>))}
      </div>

      {/* Cart Summary Card */}
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3">
          Order Estimate
        </h2>
        <div className="space-y-2 text-sm text-zinc-600">
          <div className="flex justify-between">
            <span>Total Wholesale Bags</span>
            <span className="font-semibold text-zinc-900">{totalBags}</span>
          </div>
          <div className="flex justify-between">
            <span>Base Subtotal (excl. GST)</span>
            <span className="font-semibold text-zinc-900">{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-xs text-zinc-500">
            <span>GST (approx. 5%)</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="border-t border-zinc-100 pt-3 flex justify-between items-baseline">
            <span className="text-base sm:text-lg font-bold text-zinc-900">Estimated Total</span>
            <span className="text-xl sm:text-2xl font-black text-amber-900">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-between">
        <button type="button" onClick={clearCart} className="w-full sm:w-auto rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 active:scale-95 transition-all text-center min-h-[44px]">
          Clear Cart
        </button>

        {user ? (<Link href="/checkout" className="w-full sm:w-auto rounded-xl bg-amber-600 px-8 py-3.5 text-center text-sm sm:text-base font-bold text-white shadow-md hover:bg-amber-700 active:scale-95 transition-all min-h-[48px] flex items-center justify-center cursor-pointer">
            Proceed to Checkout →
          </Link>) : (<button type="button" onClick={() => openAuthModal("/checkout")} className="w-full sm:w-auto rounded-xl bg-amber-600 px-8 py-3.5 text-center text-sm sm:text-base font-bold text-white shadow-md hover:bg-amber-700 active:scale-95 transition-all min-h-[48px] flex items-center justify-center cursor-pointer gap-2">
            <span>📱</span>
            <span>Login to Proceed to Checkout →</span>
          </button>)}
      </div>
    </div>);
}
