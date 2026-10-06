import { CartProvider } from "@/components/CartProvider";
import { CustomerNav } from "@/components/CustomerNav";
import { CustomerAuthProvider } from "@/context/CustomerAuthContext";
import { CustomerAuthModal } from "@/components/CustomerAuthModal";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerAuthProvider>
      <CartProvider>
        <div className="flex min-h-screen flex-col">
          {/* Responsive Header with Desktop Nav & Mobile Drawer */}
          <CustomerNav />

          {/* Main content */}
          <main className="flex-1">{children}</main>

          {/* Global OTP Login / Verification Modal */}
          <CustomerAuthModal />

          {/* Footer */}
          <footer className="border-t border-zinc-200 bg-zinc-50 py-8 px-4 text-center text-sm text-zinc-500">
            <div className="mx-auto max-w-6xl space-y-1">
              <p className="font-bold text-zinc-800 text-base">Rajyalakshmi Radhe Wholesale &amp; Retail Traders</p>
              <p className="text-zinc-600">Gollapudi Wholesale Grain Market, Vijayawada, Andhra Pradesh · +91 99999 00000</p>
              <p className="text-xs text-zinc-400 pt-2">© {new Date().getFullYear()} Rajyalakshmi Traders. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </CartProvider>
    </CustomerAuthProvider>
  );
}


