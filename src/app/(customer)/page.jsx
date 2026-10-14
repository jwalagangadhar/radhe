import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
export default async function HomePage() {
    const recommendedProducts = await prisma.product.findMany({
        where: { active: true },
        orderBy: { stock: "desc" },
        take: 6,
    });
    return (<>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1e3a5f] via-[#2563eb] to-[#3b82f6] text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:py-16 md:grid-cols-2 md:py-24">
          <div className="text-center md:text-left">
            <p className="mb-2 text-xs sm:text-sm font-semibold uppercase tracking-widest text-amber-200">
              Rajyalakshmi Traders · Vijayawada
            </p>
            <h1 className="mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-5xl font-extrabold leading-tight tracking-tight">
              Fresh Daily Essentials for Every Indian Home
            </h1>
            <p className="mb-6 sm:mb-8 text-sm sm:text-base md:text-lg text-blue-100 max-w-xl mx-auto md:mx-0 leading-relaxed">
              For generations, our family has brought pure dals, pulses, atta, and grains from
              Vijayawada&apos;s wholesale markets straight to your kitchen. Natural, hygienically
              packed, and priced fairly — just like home.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
              <Link href="/products" className="w-full sm:w-auto rounded-full bg-amber-400 px-6 py-3 font-bold text-zinc-900 hover:bg-amber-300 text-center shadow-md active:scale-95 transition-all min-h-[44px] flex items-center justify-center">
                Shop Wholesale Bags
              </Link>
              <Link href="/about" className="w-full sm:w-auto rounded-full border border-white/50 px-6 py-3 font-semibold text-white hover:bg-white/10 text-center active:scale-95 transition-all min-h-[44px] flex items-center justify-center">
                Our Family Story
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <Image src="/logo.png" alt="Rajyalakshmi Radhe logo" width={320} height={200} style={{ width: "auto", height: "auto" }} className="rounded-3xl bg-white/95 p-4 sm:p-6 shadow-2xl max-w-[200px] sm:max-w-xs object-contain" priority/>
          </div>
        </div>
      </section>

      {/* Recommended for You Today Section */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
              🌾 Wholesale Staples
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mt-2">
              Recommended for You Today
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Fresh sealed wholesale bags directly from Gollapudi market. Login with mobile OTP to add to cart &amp; order.
            </p>
          </div>
          <Link href="/products" className="text-xs sm:text-sm font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 shrink-0">
            <span>View All Products</span>
            <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recommendedProducts.map((p) => (<ProductCard key={p.id} product={p}/>))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <h2 className="mb-2 text-center text-2xl sm:text-3xl font-bold text-zinc-900">Our Quality Promise</h2>
        <p className="mx-auto mb-8 sm:mb-10 max-w-2xl text-center text-sm sm:text-base text-zinc-600">
          Rajyalakshmi Radhe started as a small family shop in Gollapudi, serving neighbours with
          trusted staples. Today we pack the same care into every wholesale bag — rich in protein, hygienically
          packed, and always fresh.
        </p>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {[
            { title: "Pure & Natural", desc: "Sourced from trusted suppliers, packed with care in Vijayawada.", icon: "🌿" },
            { title: "Daily Fresh Prices", desc: "Prices updated every day to reflect fair market rates.", icon: "💰" },
            { title: "Fast Local Delivery", desc: "Order online and we pack your essentials without delay.", icon: "🚚" },
        ].map((item) => (<div key={item.title} className="rounded-2xl border border-amber-100 bg-white p-5 sm:p-6 text-center shadow-xs hover:shadow-md transition-shadow">
              <div className="mb-2.5 text-3xl sm:text-4xl">{item.icon}</div>
              <h3 className="mb-1.5 text-base sm:text-lg font-bold text-zinc-900">{item.title}</h3>
              <p className="text-xs sm:text-sm text-zinc-600">{item.desc}</p>
            </div>))}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-white py-10 sm:py-16 border-t border-zinc-100">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="mb-4 text-xl sm:text-2xl font-bold text-zinc-900">Popular Categories</h2>
          <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
            {["Dals", "Atta & Grains", "Rice", "Spices"].map((cat) => (<Link key={cat} href={`/products?category=${encodeURIComponent(cat)}`} className="rounded-full border border-[#2563eb]/30 bg-blue-50 px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-[#2563eb] hover:bg-blue-100 active:scale-95 transition-all min-h-[40px] flex items-center">
                {cat}
              </Link>))}
          </div>
        </div>
      </section>
    </>);
}
