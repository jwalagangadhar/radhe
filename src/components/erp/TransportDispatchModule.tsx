"use client";

import { useState, useEffect, useCallback } from "react";

interface DeliveryChallan {
  id: string;
  challanNumber: string;
  transporterName: string;
  lrNumber: string;
  vehicleNumber: string;
  dispatchDate: string;
  destination: string;
  distanceKm: number;
  eWayBillNo?: string;
  status: string;
  order: {
    orderNumber: number;
    customerName: string;
    customerPhone: string;
  };
}

interface TransportDispatchModuleProps {
  onChallanCreated: () => void;
  onOpenPrintModal: (docData: any) => void;
}

export function TransportDispatchModule({ onChallanCreated, onOpenPrintModal }: TransportDispatchModuleProps) {
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Challan Form State
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [destination, setDestination] = useState("");
  const [distanceKm, setDistanceKm] = useState<number>(25);
  const [eWayBillNo, setEWayBillNo] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [resChallans, resOrders] = await Promise.all([
        fetch("/api/erp/transport"),
        fetch("/api/erp/orders"),
      ]);
      const dataChallans = await resChallans.json();
      const dataOrders = await resOrders.json();

      setChallans(dataChallans.challans || []);
      setOrders(dataOrders.orders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !transporterName || !lrNumber || !vehicleNumber || !destination) {
      alert("Please fill all required transport fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/erp/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId,
          transporterName,
          lrNumber,
          vehicleNumber,
          destination,
          distanceKm,
          eWayBillNo,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create Delivery Challan");

      fetchData();
      onChallanCreated();

      // Trigger Print Modal for Delivery Challan
      const targetOrder = orders.find((o) => o.id === selectedOrderId);
      onOpenPrintModal({
        type: "CHALLAN",
        challanNumber: data.challan.challanNumber,
        date: data.challan.dispatchDate,
        customer: {
          name: targetOrder?.customerName || "Customer",
          phone: targetOrder?.customerPhone || "",
          address: destination,
        },
        items: (targetOrder?.items || []).map((i: any) => ({
          name: i.product?.name || "Item",
          hsnCode: i.hsnCode,
          quantity: i.quantity,
          unit: i.product?.unit || "kg",
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
        })),
        grandTotal: targetOrder?.total || 0,
        transportDetails: {
          transporterName: data.challan.transporterName,
          lrNumber: data.challan.lrNumber,
          vehicleNumber: data.challan.vehicleNumber,
          destination: data.challan.destination,
          eWayBillNo: data.challan.eWayBillNo,
        },
      });

      // Reset form
      setSelectedOrderId("");
      setTransporterName("");
      setLrNumber("");
      setVehicleNumber("");
      setDestination("");
      setEWayBillNo("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Dispatch Form (5 cols) */}
      <div className="lg:col-span-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <span>🚛</span> Create Delivery Challan
          </h3>
          <p className="text-xs text-zinc-500">Generate transport receipt linked directly to customer orders & e-Way bills.</p>
        </div>

        <form onSubmit={handleCreateChallan} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-zinc-700">Select Customer Order *</label>
            <select
              value={selectedOrderId}
              onChange={(e) => {
                setSelectedOrderId(e.target.value);
                const order = orders.find((o) => o.id === e.target.value);
                if (order?.deliveryAddress) setDestination(order.deliveryAddress);
              }}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-base sm:text-xs min-h-[40px] text-zinc-800"
            >
              <option value="">-- Choose Approved Order --</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  Order #{o.orderNumber} - {o.customerName} (₹{o.total})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-zinc-700">Transporter Name *</label>
              <input
                type="text"
                placeholder="e.g. VRL Logistics"
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-base sm:text-xs min-h-[40px]"
              />
            </div>
            <div>
              <label className="font-semibold text-zinc-700">LR / TR Number *</label>
              <input
                type="text"
                placeholder="e.g. LR-998877"
                value={lrNumber}
                onChange={(e) => setLrNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-base sm:text-xs min-h-[40px] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-zinc-700">Vehicle Number *</label>
              <input
                type="text"
                placeholder="e.g. MH-04-EK-9821"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-base sm:text-xs min-h-[40px] uppercase font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-zinc-700">Distance (km)</label>
              <input
                type="number"
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-base sm:text-xs min-h-[40px]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700">Destination Address *</label>
            <input
              type="text"
              placeholder="e.g. Dadar West Market, Mumbai"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-base sm:text-xs min-h-[40px]"
            />
          </div>

          <div>
            <label className="font-semibold text-zinc-700">E-Way Bill Number (Optional)</label>
            <input
              type="text"
              placeholder="12-digit EWB No"
              value={eWayBillNo}
              onChange={(e) => setEWayBillNo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-base sm:text-xs min-h-[40px] font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-amber-500 py-3 min-h-[44px] text-xs font-bold text-zinc-950 shadow-md hover:bg-amber-400 disabled:opacity-50 transition flex items-center justify-center"
          >
            {isSubmitting ? "Dispatching..." : "🚚 Create Delivery Challan & Dispatch"}
          </button>
        </form>
      </div>

      {/* Right: Active Transport Receipts Table (7 cols) */}
      <div className="lg:col-span-7 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-zinc-900">Active Delivery Challans ({challans.length})</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase">
              <tr>
                <th className="p-2.5">Challan No</th>
                <th className="p-2.5">Order</th>
                <th className="p-2.5">Transporter / LR</th>
                <th className="p-2.5">Vehicle</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {challans.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <td className="p-2.5 font-bold text-amber-700">{c.challanNumber}</td>
                  <td className="p-2.5">
                    <p className="font-semibold">#{c.order.orderNumber}</p>
                    <p className="text-[10px] text-zinc-500">{c.order.customerName}</p>
                  </td>
                  <td className="p-2.5">
                    <p className="font-semibold text-zinc-900">{c.transporterName}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">LR: {c.lrNumber}</p>
                  </td>
                  <td className="p-2.5 font-mono text-zinc-800 font-semibold">{c.vehicleNumber}</td>
                  <td className="p-2.5">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                      {c.status}
                    </span>
                  </td>
                  <td className="p-2.5 text-right">
                    <button
                      onClick={() =>
                        onOpenPrintModal({
                          type: "CHALLAN",
                          challanNumber: c.challanNumber,
                          date: c.dispatchDate,
                          customer: {
                            name: c.order.customerName,
                            phone: c.order.customerPhone,
                            address: c.destination,
                          },
                          items: [],
                          grandTotal: 0,
                          transportDetails: {
                            transporterName: c.transporterName,
                            lrNumber: c.lrNumber,
                            vehicleNumber: c.vehicleNumber,
                            destination: c.destination,
                            eWayBillNo: c.eWayBillNo,
                          },
                        })
                      }
                      className="rounded bg-zinc-900 px-3 py-1.5 min-h-[36px] inline-flex items-center justify-center text-[11px] font-bold text-amber-400 hover:bg-zinc-800 transition"
                    >
                      🖨️ Print Challan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
