import Link from "next/link";
import Image from "next/image";
export const metadata = {
    title: "About Us — Rajyalakshmi Radhe Wholesale & Retail Traders",
    description: "Learn about Rajyalakshmi Radhe, Vijayawada's trusted wholesale supplier of premium dals, pulses, grains, and kitchen essentials.",
};
export default function AboutPage() {
    return (<div className="bg-stone-50 pb-16">
      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-[#1e3a5f] via-[#2563eb] to-[#3b82f6] text-white py-12 md:py-20 px-4">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-block rounded-full bg-amber-400/20 px-4 py-1 text-xs font-bold uppercase tracking-widest text-amber-200 border border-amber-400/30 mb-4">
            Our Family Heritage · Vijayawada
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Serving Pure Staples with Generations of Trust
          </h1>
          <p className="mt-4 text-base sm:text-lg text-blue-100 max-w-3xl mx-auto leading-relaxed">
            From the bustling wholesale markets of Gollapudi, Vijayawada, Rajyalakshmi Radhe has been supplying pristine dals, pulses, rice, and grains to grocery shops, caterers, and families across Andhra Pradesh.
          </p>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="mx-auto max-w-5xl px-4 -mt-8 sm:-mt-10 space-y-8">
        {/* Core Pillars Card */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-10 shadow-lg space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900">
                Wholesale Grain Excellence
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
                Founded with a simple belief: every Indian kitchen deserves unadulterated, farm-fresh pulses at honest wholesale rates. We source directly from prime agricultural regions, strictly inspecting grain density, moisture levels, and purity before packaging.
              </p>
              <div className="space-y-2 pt-2">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0 mt-0.5">✓</span>
                  <p className="text-sm text-zinc-700 font-medium">100% sortex clean, unpolished pulses with natural protein retained.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0 mt-0.5">✓</span>
                  <p className="text-sm text-zinc-700 font-medium">Standardized 25kg, 30kg, and 50kg wholesale bags with GST compliance.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0 mt-0.5">✓</span>
                  <p className="text-sm text-zinc-700 font-medium">Fast local dispatch from our Gollapudi warehouse with live tracking.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
              <Image src="/logo.png" alt="Rajyalakshmi Radhe" width={200} height={120} className="h-20 w-auto object-contain mb-4"/>
              <div className="text-center space-y-1">
                <p className="text-lg font-bold text-amber-950">Rajyalakshmi Radhe Traders</p>
                <p className="text-xs text-amber-800">Govt. Registered GST Merchant</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-amber-900 border border-amber-300 shadow-xs">
                  <span>📍</span>
                  <span>Gollapudi, Vijayawada</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-zinc-100 pt-8 text-center">
            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
              <p className="text-2xl sm:text-3xl font-black text-amber-700">30+ Yrs</p>
              <p className="text-xs text-zinc-500 font-medium mt-1">Market Experience</p>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
              <p className="text-2xl sm:text-3xl font-black text-amber-700">500+</p>
              <p className="text-xs text-zinc-500 font-medium mt-1">Retail Partners</p>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
              <p className="text-2xl sm:text-3xl font-black text-amber-700">100%</p>
              <p className="text-xs text-zinc-500 font-medium mt-1">Pure &amp; Natural</p>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
              <p className="text-2xl sm:text-3xl font-black text-amber-700">Daily</p>
              <p className="text-xs text-zinc-500 font-medium mt-1">Fair Mandi Rates</p>
            </div>
          </div>
        </div>

        {/* Wholesale & Retail Info Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm space-y-3">
            <div className="text-3xl">🎒</div>
            <h3 className="text-xl font-bold text-zinc-900">Wholesale Bag Orders (B2B)</h3>
            <p className="text-sm text-zinc-600 leading-relaxed">
              We cater to supermarkets, hotels, hostels, caterers, and regional provision stores. Orders placed online generate official GST Tax Invoices and Delivery Challans with transport integration.
            </p>
            <Link href="/products" className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 hover:text-amber-800 pt-2">
              Browse Wholesale Bags →
            </Link>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm space-y-3">
            <div className="text-3xl">🏪</div>
            <h3 className="text-xl font-bold text-zinc-900">Retail &amp; Counter Memos</h3>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Visit our Gollapudi store for walk-in retail purchases in 1kg, 500g, and 250g handy packets. Instant POS cash memos and digital UPI QR payments accepted.
            </p>
            <Link href="/track" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800 pt-2">
              Track an Existing Order →
            </Link>
          </div>
        </div>

        {/* Location & Contact */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm space-y-3">
          <h3 className="text-lg font-bold text-zinc-900">Visit Our Depot</h3>
          <p className="text-sm text-zinc-600 max-w-xl mx-auto">
            Rajyalakshmi Radhe Wholesale &amp; Retail Traders, Main Commercial Road, Gollapudi Wholesale Market, Vijayawada – 521225, Andhra Pradesh.
          </p>
          <p className="text-sm font-semibold text-amber-800">
            Helpline: +91 9642423395 · Open Monday to Saturday: 8:00 AM – 8:00 PM
          </p>
        </div>
      </div>
    </div>);
}
