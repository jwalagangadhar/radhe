"use client";
import { Suspense } from "react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORIES } from "@/lib/types";
function ProductsPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState(searchParams.get("search") ?? "");
    const [category, setCategory] = useState(searchParams.get("category") ?? "All");
    const [loading, setLoading] = useState(true);
    const loadProducts = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (category !== "All")
            params.set("category", category);
        if (search)
            params.set("search", search);
        params.set("orderType", "WEB");
        const res = await fetch(`/api/products?${params}`);
        const data = await res.json();
        setProducts(data.products ?? []);
        setLoading(false);
    }, [category, search]);
    useEffect(() => {
        const timer = setTimeout(loadProducts, 300);
        return () => clearTimeout(timer);
    }, [loadProducts]);
    return (<div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">Wholesale Product Catalog</h1>
        <p className="text-xs sm:text-sm text-zinc-500">
          Showing sealed wholesale bags (25kg - 50kg) packed with sortex-clean Vijayawada grains.
        </p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input type="search" placeholder="Search dals, rice, atta, grains..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 sm:py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 min-h-[44px]"/>
          {search && (<button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 hover:text-zinc-600 p-1">
              ✕
            </button>)}
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 sm:py-3 text-sm font-medium text-zinc-700 focus:border-amber-500 focus:outline-none min-h-[44px]">
          {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
        </select>
      </div>

      {loading ? (<div className="py-16 text-center text-zinc-500 space-y-2">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"/>
          <p className="text-sm font-medium">Loading catalog products...</p>
        </div>) : products.length === 0 ? (<div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-500 space-y-3">
          <span className="text-4xl">🌾</span>
          <p className="text-base font-bold text-zinc-700">No products found</p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            No items matched your current search or category filter. Try clearing your filters.
          </p>
          <button type="button" onClick={() => {
                setSearch("");
                setCategory("All");
            }} className="rounded-full bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 transition">
            Reset Filters
          </button>
        </div>) : (<div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (<ProductCard key={product.id} product={product}/>))}
        </div>)}
    </div>);
}
export default function ProductsPage() {
    return (<Suspense fallback={<p className="p-8 text-center">Loading...</p>}>
      <ProductsPageInner />
    </Suspense>);
}
