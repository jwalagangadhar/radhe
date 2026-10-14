"use client";
import { useState } from "react";
export function PrintControllerModal({ isOpen, onClose, documentData, company = {
    companyName: "Radhe Wholesale & Retail Traders",
    gstin: "27AAAAA0000A1Z5",
    address: "123 Commercial Market Yard, Main Gate",
    city: "Mumbai",
    state: "Maharashtra (27)",
    phone: "+91 9876543210",
    email: "billing@radhetraders.com",
    pan: "AAAAA0000A",
    bankName: "State Bank of India",
    accountNumber: "38472910482",
    ifscCode: "SBIN0001234",
    upiId: "radhetraders@sbi",
    termsAndConditions: "1. Goods once sold will not be returned.\n2. Interest @ 18% p.a. will be charged for delayed payments.",
}, }) {
    const [copyPreset, setCopyPreset] = useState("ORIGINAL");
    const [paperFormat, setPaperFormat] = useState("A4");
    if (!isOpen)
        return null;
    const handlePrint = () => {
        window.print();
    };
    const upiQrString = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${company.upiId}&pn=${encodeURIComponent(company.companyName)}&am=${documentData.grandTotal}&cu=INR`)}`;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-xl sm:rounded-2xl bg-zinc-900 text-white shadow-2xl overflow-hidden print:m-0 print:p-0 print:bg-white print:text-black">
        {/* Top Control Bar (Hidden during actual print) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6 py-3 sm:py-4 print:hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="rounded-lg bg-amber-500/20 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold text-amber-400 border border-amber-500/30">
              MULTI-COPY PRINT CONTROLLER
            </span>
            <h2 className="text-base sm:text-lg font-semibold text-zinc-100">Print Engine</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Copy Presets */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-800 p-1 text-xs font-medium w-full sm:w-auto">
              <button onClick={() => {
            setCopyPreset("ORIGINAL");
            setPaperFormat("A4");
        }} className={`flex-1 sm:flex-none rounded-md px-2.5 sm:px-3 py-1.5 transition text-center min-h-[34px] flex items-center justify-center ${copyPreset === "ORIGINAL" ? "bg-amber-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"}`}>
                1. Original (Recipient)
              </button>
              <button onClick={() => {
            setCopyPreset("DUPLICATE");
            setPaperFormat("A4");
        }} className={`flex-1 sm:flex-none rounded-md px-2.5 sm:px-3 py-1.5 transition text-center min-h-[34px] flex items-center justify-center ${copyPreset === "DUPLICATE" ? "bg-amber-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"}`}>
                2. Duplicate (Transporter)
              </button>
              <button onClick={() => {
            setCopyPreset("TRIPLICATE");
            setPaperFormat("A4");
        }} className={`flex-1 sm:flex-none rounded-md px-2.5 sm:px-3 py-1.5 transition text-center min-h-[34px] flex items-center justify-center ${copyPreset === "TRIPLICATE" ? "bg-amber-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"}`}>
                3. Triplicate (Supplier)
              </button>
              <button onClick={() => {
            setCopyPreset("THERMAL");
            setPaperFormat("THERMAL_3INCH");
        }} className={`flex-1 sm:flex-none rounded-md px-2.5 sm:px-3 py-1.5 transition text-center min-h-[34px] flex items-center justify-center ${copyPreset === "THERMAL" ? "bg-amber-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"}`}>
                4. Mini (Thermal)
              </button>
            </div>

            {/* Paper Size selector */}
            <select value={paperFormat} onChange={(e) => setPaperFormat(e.target.value)} className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 outline-none min-h-[36px]">
              <option value="A4">A4 Format</option>
              <option value="A5">A5 Format</option>
              <option value="THERMAL_3INCH">3-Inch Thermal</option>
            </select>

            <button onClick={handlePrint} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 sm:px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 transition min-h-[36px]">
              🖨️ Print
            </button>

            <button onClick={onClose} className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white min-h-[36px]">
              ✕ Close
            </button>
          </div>
        </div>

        {/* Printable Canvas */}
        <div className="flex-1 overflow-y-auto bg-zinc-800 p-3 sm:p-6 print:bg-white print:p-0 print:text-black print:overflow-visible">
          <div id="print-area" className={`mx-auto bg-white p-4 sm:p-8 text-black shadow-2xl rounded-sm font-sans text-xs border border-zinc-300 print:shadow-none print:border-none print:p-2 ${paperFormat === "THERMAL_3INCH" ? "max-w-[320px] text-[11px]" : paperFormat === "A5" ? "max-w-[550px]" : "max-w-4xl"}`}>
            {/* Multi-Copy Watermark Header */}
            <div className="mb-4 flex items-center justify-between border-b-2 border-zinc-900 pb-3">
              <div>
                <h1 className="text-xl font-extrabold uppercase tracking-wide text-zinc-900">{company.companyName}</h1>
                <p className="text-[11px] text-zinc-600">{company.address}, {company.city}, {company.state}</p>
                <p className="text-[11px] text-zinc-600">
                  <span className="font-semibold text-zinc-800">GSTIN:</span> {company.gstin} | <span className="font-semibold text-zinc-800">Phone:</span> {company.phone}
                </p>
              </div>

              <div className="text-right">
                <div className="inline-block rounded-md border-2 border-zinc-900 bg-zinc-100 px-3 py-1 text-center font-bold text-zinc-900 uppercase">
                  {copyPreset === "ORIGINAL" && "ORIGINAL FOR RECIPIENT"}
                  {copyPreset === "DUPLICATE" && "DUPLICATE FOR TRANSPORTER"}
                  {copyPreset === "TRIPLICATE" && "TRIPLICATE FOR SUPPLIER"}
                  {copyPreset === "THERMAL" && "MINI ORDER ACKNOWLEDGMENT"}
                </div>
                <p className="mt-1 text-[10px] font-semibold text-zinc-500 uppercase">
                  {documentData.type === "INVOICE" ? "TAX INVOICE" : documentData.type === "CHALLAN" ? "DELIVERY CHALLAN" : documentData.type === "CASH_MEMO" ? "CASH MEMO / RETAIL BILL" : "ORDER SLIP"}
                </p>
              </div>
            </div>

            {/* Meta Data Box */}
            <div className="mb-4 grid grid-cols-2 gap-4 rounded-md border border-zinc-300 bg-zinc-50 p-3">
              <div>
                <p className="font-bold text-zinc-900 uppercase text-[11px] border-b border-zinc-200 pb-1 mb-1">
                  Billed To / Recipient Details:
                </p>
                <p className="font-semibold text-zinc-900">{documentData.customer.name}</p>
                <p className="text-zinc-600">{documentData.customer.address || "Walk-in Counter"}</p>
                <p className="text-zinc-600">Phone: {documentData.customer.phone}</p>
                {documentData.customer.gstNumber && (<p className="font-semibold text-zinc-800">GSTIN: {documentData.customer.gstNumber}</p>)}
              </div>

              <div className="text-right space-y-1">
                <p className="font-bold text-zinc-900">
                  {documentData.type === "INVOICE" ? "Invoice No:" : documentData.type === "CASH_MEMO" ? "Bill No:" : "Document No:"}{" "}
                  <span className="text-amber-700">{documentData.invoiceNumber || documentData.challanNumber || (documentData.billNumber ? `BILL-#${documentData.billNumber}` : `ORD-#${documentData.orderNumber}`)}</span>
                </p>
                <p className="text-zinc-600">Date: {new Date(documentData.date).toLocaleDateString("en-IN")}</p>

                {documentData.transportDetails && (<div className="mt-2 border-t border-zinc-200 pt-1 text-[11px]">
                    <p><span className="font-semibold">Transporter:</span> {documentData.transportDetails.transporterName}</p>
                    <p><span className="font-semibold">LR / TR No:</span> {documentData.transportDetails.lrNumber}</p>
                    <p><span className="font-semibold">Vehicle No:</span> {documentData.transportDetails.vehicleNumber}</p>
                    {documentData.transportDetails.eWayBillNo && (<p className="font-bold text-emerald-700">E-Way Bill: {documentData.transportDetails.eWayBillNo}</p>)}
                  </div>)}
              </div>
            </div>

            {/* Items Table — CASH_MEMO: simple columns (no HSN / no GST%) */}
            <div className="overflow-x-auto print:overflow-visible">
            {documentData.type === "CASH_MEMO" ? (<table className="w-full min-w-[320px] border-collapse border border-zinc-300 text-[11px]">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-800 uppercase font-semibold text-left">
                    <th className="border border-zinc-300 p-2 text-center w-8">#</th>
                    <th className="border border-zinc-300 p-2">Item</th>
                    <th className="border border-zinc-300 p-2 text-right">Qty</th>
                    <th className="border border-zinc-300 p-2 text-right">Rate</th>
                    <th className="border border-zinc-300 p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {documentData.items.map((item, idx) => (<tr key={idx} className="border-b border-zinc-200 hover:bg-zinc-50">
                      <td className="border border-zinc-300 p-2 text-center font-medium">{idx + 1}</td>
                      <td className="border border-zinc-300 p-2 font-semibold text-zinc-900">{item.name}</td>
                      <td className="border border-zinc-300 p-2 text-right font-bold">{item.quantity} {item.unit}</td>
                      <td className="border border-zinc-300 p-2 text-right">₹{item.unitPrice.toFixed(2)}</td>
                      <td className="border border-zinc-300 p-2 text-right font-bold text-zinc-900">₹{item.subtotal.toFixed(2)}</td>
                    </tr>))}
                </tbody>
              </table>) : (<table className="w-full min-w-[480px] border-collapse border border-zinc-300 text-[11px]">
              <thead>
                <tr className="bg-zinc-100 text-zinc-800 uppercase font-semibold text-left">
                  <th className="border border-zinc-300 p-2 text-center w-8">#</th>
                  <th className="border border-zinc-300 p-2">Item Description</th>
                  <th className="border border-zinc-300 p-2 text-center">HSN</th>
                  <th className="border border-zinc-300 p-2 text-center">Batch</th>
                  <th className="border border-zinc-300 p-2 text-right">Qty</th>
                  <th className="border border-zinc-300 p-2 text-right">Rate</th>
                  <th className="border border-zinc-300 p-2 text-right">GST %</th>
                  <th className="border border-zinc-300 p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {documentData.items.map((item, idx) => (<tr key={idx} className="border-b border-zinc-200 hover:bg-zinc-50">
                    <td className="border border-zinc-300 p-2 text-center font-medium">{idx + 1}</td>
                    <td className="border border-zinc-300 p-2 font-semibold text-zinc-900">{item.name}</td>
                    <td className="border border-zinc-300 p-2 text-center font-mono">{item.hsnCode || "1006"}</td>
                    <td className="border border-zinc-300 p-2 text-center text-zinc-500">{item.batchNumber || "-"}</td>
                    <td className="border border-zinc-300 p-2 text-right font-bold">{item.quantity} {item.unit}</td>
                    <td className="border border-zinc-300 p-2 text-right">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="border border-zinc-300 p-2 text-right">{item.gstRate || 5}%</td>
                    <td className="border border-zinc-300 p-2 text-right font-bold text-zinc-900">₹{item.subtotal.toFixed(2)}</td>
                  </tr>))}
              </tbody>
            </table>)}
            </div>

            {/* HSN & Tax Summary Table */}
            {documentData.taxSummary && documentData.taxSummary.length > 0 && (<div className="mt-4">
                <p className="font-bold text-zinc-800 mb-1 uppercase text-[10px]">HSN Tax Breakdown Summary:</p>
                <table className="w-full border-collapse border border-zinc-300 text-[10px]">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-700">
                      <th className="border border-zinc-300 p-1 text-center">HSN</th>
                      <th className="border border-zinc-300 p-1 text-right">Taxable Val</th>
                      <th className="border border-zinc-300 p-1 text-right">CGST</th>
                      <th className="border border-zinc-300 p-1 text-right">SGST</th>
                      <th className="border border-zinc-300 p-1 text-right">IGST</th>
                      <th className="border border-zinc-300 p-1 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentData.taxSummary.map((sum, idx) => (<tr key={idx}>
                        <td className="border border-zinc-300 p-1 text-center font-mono">{sum.hsnCode}</td>
                        <td className="border border-zinc-300 p-1 text-right">₹{sum.taxableValue.toFixed(2)}</td>
                        <td className="border border-zinc-300 p-1 text-right">₹{sum.cgstAmount.toFixed(2)}</td>
                        <td className="border border-zinc-300 p-1 text-right">₹{sum.sgstAmount.toFixed(2)}</td>
                        <td className="border border-zinc-300 p-1 text-right">₹{sum.igstAmount.toFixed(2)}</td>
                        <td className="border border-zinc-300 p-1 text-right font-semibold">₹{sum.totalTax.toFixed(2)}</td>
                      </tr>))}
                  </tbody>
                </table>
              </div>)}

            {/* Totals & UPI QR Section */}
            {documentData.type === "CASH_MEMO" ? (
        /* ── Cash Memo Simple Totals ── */
        <div className="mt-4 border-t-2 border-zinc-900 pt-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-600">
                  <span>Gross Total:</span>
                  <span className="font-semibold">₹{(documentData.grossTotal ?? documentData.grandTotal).toFixed(2)}</span>
                </div>
                {(documentData.discountAmount ?? 0) > 0 && (<div className="flex justify-between text-zinc-600">
                    <span>Discount:</span>
                    <span className="text-red-600">- ₹{(documentData.discountAmount ?? 0).toFixed(2)}</span>
                  </div>)}
                <div className="flex justify-between border-t-2 border-zinc-900 pt-1.5 text-sm font-extrabold text-zinc-900">
                  <span>Net Payable:</span>
                  <span className="text-orange-700">₹{documentData.grandTotal.toLocaleString("en-IN")}</span>
                </div>
                {documentData.paymentMode && (<div className="flex justify-between text-zinc-500 text-[10px]">
                    <span>Payment Mode:</span>
                    <span className="font-bold text-zinc-700">{documentData.paymentMode}</span>
                  </div>)}
                <div className="mt-3 rounded-md bg-zinc-50 border border-zinc-200 p-2 text-center text-[10px] text-zinc-500">
                  <p className="font-bold text-zinc-700 text-xs">🙏 Thank You for Shopping!</p>
                  <p>This is a cash memo / retail bill. Not valid for GST input credit.</p>
                </div>
              </div>) : (<div className="mt-4 flex flex-wrap justify-between items-start gap-4 border-t-2 border-zinc-900 pt-3">
              <div className="flex items-center gap-4">
                <div className="text-center border border-zinc-300 p-2 rounded bg-zinc-50">
                  {/* eslint-disable-next-html-next-image */}
                  <img src={upiQrString} alt="UPI Payment QR Code" className="w-24 h-24 mx-auto"/>
                  <p className="text-[9px] font-bold text-zinc-700 mt-1">Scan & Pay via UPI</p>
                  <p className="text-[8px] font-mono text-zinc-500">{company.upiId}</p>
                </div>

                <div className="max-w-xs text-[10px] text-zinc-600">
                  <p className="font-bold text-zinc-800 uppercase">Bank Details for NEFT/RTGS:</p>
                  <p><span className="font-semibold">Bank:</span> {company.bankName}</p>
                  <p><span className="font-semibold">A/c No:</span> {company.accountNumber}</p>
                  <p><span className="font-semibold">IFSC:</span> {company.ifscCode}</p>
                </div>
              </div>

              <div className="w-56 text-right space-y-1 text-[11px]">
                <div className="flex justify-between text-zinc-600">
                  <span>Taxable Amount:</span>
                  <span className="font-semibold">₹{(documentData.taxableTotal || documentData.grandTotal).toFixed(2)}</span>
                </div>
                {documentData.cgstTotal ? (<div className="flex justify-between text-zinc-600">
                    <span>CGST:</span>
                    <span>₹{documentData.cgstTotal.toFixed(2)}</span>
                  </div>) : null}
                {documentData.sgstTotal ? (<div className="flex justify-between text-zinc-600">
                    <span>SGST:</span>
                    <span>₹{documentData.sgstTotal.toFixed(2)}</span>
                  </div>) : null}
                {documentData.igstTotal ? (<div className="flex justify-between text-zinc-600">
                    <span>IGST:</span>
                    <span>₹{documentData.igstTotal.toFixed(2)}</span>
                  </div>) : null}
                {documentData.roundOff !== undefined && (<div className="flex justify-between text-zinc-500">
                    <span>Round-Off:</span>
                    <span>₹{documentData.roundOff.toFixed(2)}</span>
                  </div>)}
                <div className="flex justify-between border-t-2 border-zinc-900 pt-1 text-sm font-extrabold text-zinc-900">
                  <span>Grand Total:</span>
                  <span className="text-amber-700">₹{documentData.grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>)}

            {/* Terms & Authorization Footer — hidden for CASH_MEMO */}
            {documentData.type !== "CASH_MEMO" && (<div className="mt-6 flex justify-between items-end border-t border-zinc-300 pt-3 text-[10px]">
              <div className="max-w-md text-zinc-500">
                <p className="font-bold text-zinc-700">Terms & Conditions:</p>
                <p className="whitespace-pre-line">{company.termsAndConditions}</p>
              </div>

              <div className="text-right">
                <p className="font-bold text-zinc-800 mb-8">For {company.companyName}</p>
                <p className="border-t border-zinc-400 pt-1 font-semibold text-zinc-600">Authorized Signatory</p>
              </div>
            </div>)}
          </div>
        </div>
      </div>
    </div>);
}
