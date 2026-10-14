"use client";
import { formatCurrency, getProductBagPrice } from "@/lib/types";
import { useCart } from "@/components/CartProvider";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
export function ProductCard({ product }) {
    const { items, addItem, updateQuantity } = useCart();
    const { user, openAuthModal } = useCustomerAuth();
    // Website orders strictly use Wholesale Bag Count (25kg - 50kg) under GST
    const bagWeight = product.bagWeight && product.bagWeight > 0 ? product.bagWeight : 30;
    const bagPrice = getProductBagPrice(product, "WEB");
    const cartItemId = `${product.id}-${bagWeight}kg_bag`;
    const cartItem = items.find((i) => i.productId === cartItemId || i.productId === product.id);
    const inCart = Boolean(cartItem);
    const outOfStock = product.stock <= 0;
    const maxReached = Boolean(cartItem && cartItem.quantity >= product.stock);
    // Availability badge — clearly displays wholesale bag count
    const availabilityLabel = product.stock <= 0
        ? { text: "Out of Stock", color: "text-red-500" }
        : product.stock <= 10
            ? { text: `Limited Stock (${product.stock} Bags)`, color: "text-amber-500" }
            : { text: `In Stock (${product.stock} Bags available)`, color: "text-emerald-600" };
    return (<article className="glass-card card-lift flex flex-col overflow-hidden rounded-2xl">
      <div className="flex h-36 sm:h-40 w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 text-5xl relative overflow-hidden">
        {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image} alt={product.name} className="h-full w-full object-contain p-2"/>) : (<span className="text-4xl sm:text-5xl" aria-hidden="true">🛒</span>)}

        <span className="absolute top-2 right-2 rounded-lg bg-zinc-900/90 backdrop-blur-xs px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-black text-amber-400 border border-amber-500/40 shadow-xs">
          🎒 {bagWeight} kg BAG
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
        <div>
          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 truncate">
              {product.category}
            </p>
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
              GST {product.gstRate || 5}%
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-zinc-900 mt-1 line-clamp-2 break-words">
            {product.name}
          </h3>
        </div>

        {/* Wholesale Bag Spec Banner */}
        <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-2 sm:p-2.5 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-amber-950 flex items-center gap-1 text-[11px] sm:text-xs">
              <span>🎒</span> Bag Packing:
            </span>
            <span className="font-black text-amber-900 bg-white/90 px-1.5 py-0.5 rounded border border-amber-200 text-[10px] sm:text-xs">
              {bagWeight} kg / Bag
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-amber-800/80 leading-tight">
            Sold in whole bags only. Pure wholesale grains.
          </p>
        </div>

        {/* Availability badge */}
        <p className={`text-[11px] sm:text-xs font-semibold ${availabilityLabel.color}`}>
          {availabilityLabel.text}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100">
          <div>
            <p className="text-lg sm:text-xl font-black text-amber-900 leading-none">
              {formatCurrency(bagPrice)}
            </p>
            <p className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5">per 1 Bag ({bagWeight}kg)</p>
          </div>

          {inCart && cartItem ? (<div className="flex items-center overflow-hidden rounded-2xl border border-orange-500 bg-orange-50 shadow-xs">
              <button type="button" onClick={() => updateQuantity(cartItem.productId, cartItem.quantity - 1)} aria-label={`Decrease quantity for ${product.name}`} className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center text-lg font-black text-orange-700 hover:bg-orange-100 active:bg-orange-200 transition-colors cursor-pointer">
                −
              </button>
              <span className="min-w-7 px-1 text-center text-sm font-black text-orange-950">
                {cartItem.quantity}
              </span>
              <button type="button" onClick={() => {
                if (maxReached)
                    return;
                updateQuantity(cartItem.productId, cartItem.quantity + 1);
            }} disabled={maxReached} aria-label={`Increase quantity for ${product.name}`} className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center text-lg font-black text-orange-700 hover:bg-orange-100 disabled:opacity-40 active:bg-orange-200 transition-colors cursor-pointer">
                +
              </button>
            </div>) : !user ? (<button type="button" disabled={outOfStock} onClick={() => openAuthModal()} aria-label={`Login to add 1 bag of ${product.name} to cart`} className="rounded-2xl bg-amber-600 hover:bg-amber-700 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-black text-white shadow-xs transition active:scale-95 disabled:cursor-not-allowed disabled:bg-zinc-300 min-h-[40px] sm:min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer">
              {outOfStock ? "Unavailable" : (<>
                  <span className="text-xs">🔒</span>
                  <span>Login to Add</span>
                </>)}
            </button>) : (<button type="button" disabled={outOfStock} onClick={() => addItem({
                productId: cartItemId,
                name: `${product.name} (1 Bag - ${bagWeight}kg)`,
                price: bagPrice,
                unit: "Bag",
                stock: product.stock,
                gstRate: product.gstRate || 5,
                hsnCode: product.hsnCode || "1006",
                image: product.image,
                variantId: `${bagWeight}kg_bag`,
                variantLabel: `1 Bag (${bagWeight}kg)`,
            })} aria-label={`Add 1 bag of ${product.name} to cart`} className="btn-gold rounded-2xl px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-black shadow-sm disabled:cursor-not-allowed disabled:opacity-40 min-h-[40px] sm:min-h-[44px] flex items-center justify-center cursor-pointer">
              {outOfStock ? "Unavailable" : "+ Add Bag"}
            </button>)}
        </div>
      </div>
    </article>);
}
