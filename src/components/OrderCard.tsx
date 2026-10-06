import { formatCurrency, orderStatusLabel, orderTypeLabel } from "@/lib/types";
import type { OrderWithItems } from "@/lib/types";

export function OrderCard({
  order,
  actions,
}: {
  order: OrderWithItems;
  actions?: React.ReactNode;
}) {
  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-sm space-y-3.5">
      {/* 1. Order Information */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-100 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-black text-stone-900">
              Order #{order.orderNumber}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                order.status === "COMPLETED"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : order.status === "PACKING"
                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                  : order.status === "APPROVED"
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : order.status === "CANCELLED"
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-stone-100 text-stone-700 border border-stone-200"
              }`}
            >
              {orderStatusLabel(order.status)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-stone-500">
            <span>{orderTypeLabel(order.type)}</span>
            {formattedDate && <span>• {formattedDate}</span>}
          </div>
        </div>

        {/* Payment / Grand Total */}
        <div className="text-right shrink-0">
          <span className="text-[11px] font-semibold text-stone-500 block">Total Amount</span>
          <span className="text-lg sm:text-xl font-black text-amber-900">
            {formatCurrency(order.total)}
          </span>
        </div>
      </div>

      {/* Badges for Invoice and Challan */}
      {(order.invoice?.invoiceNumber || order.deliveryChallan?.challanNumber) && (
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          {order.invoice?.invoiceNumber && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 font-bold text-emerald-700 border border-emerald-200">
              <span>📄</span> Invoice: {order.invoice.invoiceNumber}
            </span>
          )}
          {order.deliveryChallan?.challanNumber && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 font-bold text-blue-700 border border-blue-200">
              <span>🚚</span> Challan: {order.deliveryChallan.challanNumber}
            </span>
          )}
        </div>
      )}

      {/* 2. Customer Information Card */}
      {order.customerName && (
        <div className="rounded-xl bg-stone-50 p-3 text-xs sm:text-sm text-stone-700 space-y-1 border border-stone-100">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">
            Customer Information
          </p>
          <p className="font-bold text-stone-900 text-sm">{order.customerName}</p>
          {order.customerPhone && (
            <p className="font-mono text-xs flex items-center gap-1.5 text-stone-600">
              <span>📞</span>
              <a
                href={`tel:${order.customerPhone}`}
                className="text-amber-800 hover:underline font-bold"
              >
                {order.customerPhone}
              </a>
            </p>
          )}
          {order.deliveryAddress && (
            <p className="text-xs text-stone-600 break-words flex items-start gap-1.5 pt-0.5">
              <span className="shrink-0">📍</span>
              <span>{order.deliveryAddress}</span>
            </p>
          )}
          {order.createdBy && (
            <p className="text-[11px] text-stone-400 pt-0.5">Created by: {order.createdBy.name}</p>
          )}
        </div>
      )}

      {/* 3. Products List */}
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 mb-2">
          Ordered Products ({(order.items ?? []).length})
        </p>
        <ul className="space-y-1.5 text-xs sm:text-sm divide-y divide-stone-100">
          {(order.items ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 pt-1.5 first:pt-0">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-stone-900 truncate">
                  {item.product?.name ?? "Product Item"}
                </p>
                <p className="text-[11px] text-stone-500">
                  {item.quantity} {item.product?.unit ?? "units"} × {formatCurrency(item.unitPrice ?? 0)}
                </p>
              </div>
              <span className="font-bold text-stone-900 shrink-0 text-right">
                {formatCurrency(item.subtotal ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* 4. Actions */}
      {actions && (
        <div className="pt-3 border-t border-stone-100">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 mb-2">
            Actions
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        </div>
      )}
    </div>
  );
}
