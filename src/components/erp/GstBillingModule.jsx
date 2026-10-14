"use client";
import { useState, useEffect } from "react";
export function GstBillingModule({ onInvoiceCreated, onOpenPrintModal }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const fetchOrders = async () => {
        try {
            const res = await fetch("/api/erp/orders");
            const data = await res.json();
            setOrders(data.orders || []);
        }
        catch (e) {
            console.error(e);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchOrders();
    }, []);
    const handleGenerateInvoice = async (order) => {
        try {
            const res = await fetch("/api/erp/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderId: order.id,
                    discountAmount,
                }),
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error || "Failed to generate GST Invoice");
            fetchOrders();
            onInvoiceCreated();
            // Trigger Multi-Copy Print Modal
            onOpenPrintModal({
                type: "INVOICE",
                invoiceNumber: data.invoice.invoiceNumber,
                date: data.invoice.invoiceDate,
                customer: {
                    name: order.customerName,
                    phone: order.customerPhone,
                    gstNumber: order.gstNumber,
                    stateCode: order.customerStateCode,
                },
                items: order.items.map((i) => ({
                    name: i.product.name,
                    hsnCode: i.hsnCode,
                    quantity: i.quantity,
                    unit: i.product.unit,
                    unitPrice: i.unitPrice,
                    gstRate: i.gstRate,
                    subtotal: i.subtotal,
                })),
                taxableTotal: data.invoice.totalTaxable,
                cgstTotal: data.invoice.totalCgst,
                sgstTotal: data.invoice.totalSgst,
                igstTotal: data.invoice.totalIgst,
                roundOff: data.invoice.roundOff,
                grandTotal: data.invoice.grandTotal,
            });
            setSelectedOrder(null);
        }
        catch (e) {
            alert(e.message);
        }
    };
    return (<div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">GST Compliance & Billing Desk</h2>
          <p className="text-xs text-zinc-500">Automated Place of Supply tax determination, HSN breakdown, & Double-Entry Ledger posting.</p>
        </div>
        <button onClick={fetchOrders} className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200">
          🔄 Refresh Orders
        </button>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase">
              <tr>
                <th className="p-3">Order No</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Place of Supply</th>
                <th className="p-3">Taxable Val</th>
                <th className="p-3">CGST / SGST</th>
                <th className="p-3">IGST</th>
                <th className="p-3">Grand Total</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-zinc-200">
            {loading ? (<tr>
                <td colSpan={9} className="p-6 text-center text-zinc-400">Loading orders...</td>
              </tr>) : orders.length === 0 ? (<tr>
                <td colSpan={9} className="p-6 text-center text-zinc-400">No orders found. Create an order to begin billing.</td>
              </tr>) : (orders.map((order) => {
            const isInter = order.customerStateCode !== "37";
            return (<tr key={order.id} className="hover:bg-zinc-50 transition">
                    <td className="p-3 font-bold text-amber-700">#{order.orderNumber}</td>
                    <td className="p-3">
                      <p className="font-semibold text-zinc-900">{order.customerName}</p>
                      <p className="text-[10px] text-zinc-500">{order.customerPhone}</p>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${isInter ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                        State {order.customerStateCode} ({isInter ? "Inter-State" : "Intra-State"})
                      </span>
                    </td>
                    <td className="p-3 font-mono">₹{order.totalTaxable.toFixed(2)}</td>
                    <td className="p-3 font-mono text-zinc-600">
                      {isInter ? "-" : `₹${(order.totalCgst + order.totalSgst).toFixed(2)}`}
                    </td>
                    <td className="p-3 font-mono text-zinc-600">
                      {isInter ? `₹${order.totalIgst.toFixed(2)}` : "-"}
                    </td>
                    <td className="p-3 font-extrabold text-zinc-900">₹{order.total.toLocaleString("en-IN")}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${order.status === "INVOICED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {order.invoice ? (<button onClick={() => onOpenPrintModal({
                        type: "INVOICE",
                        invoiceNumber: order.invoice?.invoiceNumber,
                        date: order.createdAt,
                        customer: {
                            name: order.customerName,
                            phone: order.customerPhone,
                            gstNumber: order.gstNumber,
                            stateCode: order.customerStateCode,
                        },
                        items: order.items.map((i) => ({
                            name: i.product.name,
                            hsnCode: i.hsnCode,
                            quantity: i.quantity,
                            unit: i.product.unit,
                            unitPrice: i.unitPrice,
                            gstRate: i.gstRate,
                            subtotal: i.subtotal,
                        })),
                        taxableTotal: order.totalTaxable,
                        cgstTotal: order.totalCgst,
                        sgstTotal: order.totalSgst,
                        igstTotal: order.totalIgst,
                        grandTotal: order.invoice?.grandTotal || order.total,
                    })} className="rounded-lg bg-zinc-900 px-3 py-2 min-h-[38px] text-xs font-bold text-amber-400 hover:bg-zinc-800 transition inline-flex items-center justify-center">
                          📄 View / Print Invoice
                        </button>) : (<button onClick={() => handleGenerateInvoice(order)} className="rounded-lg bg-amber-500 px-3 py-2 min-h-[38px] text-xs font-bold text-zinc-950 hover:bg-amber-400 transition inline-flex items-center justify-center">
                          ⚡ Generate GST Invoice
                        </button>)}
                    </td>
                  </tr>);
        }))}
          </tbody>
        </table>
        </div>
      </div>
    </div>);
}
