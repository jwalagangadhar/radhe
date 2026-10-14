"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
function OrderSuccessContent() {
    const orderNumberFromUrl = useSearchParams().get("orderNumber");
    const [orderNumber, setOrderNumber] = useState(orderNumberFromUrl);
    const [invoiceNumber, setInvoiceNumber] = useState(null);
    const [challanNumber, setChallanNumber] = useState(null);
    useEffect(() => {
        const savedOrderNumber = sessionStorage.getItem("lastOrderNumber");
        const savedInvoiceNumber = sessionStorage.getItem("invoiceNumber");
        const savedChallanNumber = sessionStorage.getItem("challanNumber");
        setOrderNumber(orderNumberFromUrl ?? savedOrderNumber);
        setInvoiceNumber(savedInvoiceNumber);
        setChallanNumber(savedChallanNumber);
    }, [orderNumberFromUrl]);
    return (<div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 py-8 sm:py-16 text-center max-w-xl mx-auto">
      <div className="text-6xl sm:text-7xl animate-bounce">✅</div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">Order Placed Successfully!</h1>
      
      <div className="w-full space-y-2">
        {orderNumber && (<p className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-3 text-base sm:text-lg font-bold text-amber-900 break-words">
            Tracking Number: #{orderNumber}
          </p>)}
        {invoiceNumber && (<p className="rounded-2xl bg-slate-100 border border-slate-200 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 font-mono break-words">
            Tax Invoice: {invoiceNumber}
          </p>)}
      </div>

      <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-md">
        Thank you for choosing Rajyalakshmi Radhe Traders. Your order has been registered in our Vijayawada warehouse packing queue.
      </p>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center w-full pt-2">
        {invoiceNumber && (<Link href={`/uploads/invoices/${encodeURIComponent(invoiceNumber)}.pdf`} target="_blank" className="w-full sm:w-auto rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 active:scale-95 transition-all min-h-[44px] flex items-center justify-center">
            📄 Download Invoice PDF
          </Link>)}
        {orderNumber && (<Link href={`/track?orderNumber=${encodeURIComponent(orderNumber)}`} className="w-full sm:w-auto rounded-full bg-amber-600 px-6 py-3 text-sm font-bold text-white hover:bg-amber-700 active:scale-95 transition-all min-h-[44px] flex items-center justify-center">
            📦 Track This Order
          </Link>)}
        <Link href="/account" className="w-full sm:w-auto rounded-full bg-zinc-900 px-6 py-3 text-sm font-bold text-amber-300 hover:bg-zinc-800 active:scale-95 transition-all min-h-[44px] flex items-center justify-center gap-1.5">
          <span>👤</span>
          <span>View in My Account</span>
        </Link>
        <Link href="/products" className="w-full sm:w-auto rounded-full border border-amber-600 px-6 py-3 text-sm font-bold text-amber-700 hover:bg-amber-50 active:scale-95 transition-all min-h-[44px] flex items-center justify-center">
          Continue Shopping
        </Link>
        <Link href="/" className="w-full sm:w-auto rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 active:scale-95 transition-all min-h-[44px] flex items-center justify-center">
          Go Home
        </Link>
      </div>
    </div>);
}
export default function OrderSuccessPage() {
    return (<Suspense fallback={<p className="p-8 text-center">Loading...</p>}>
      <OrderSuccessContent />
    </Suspense>);
}
