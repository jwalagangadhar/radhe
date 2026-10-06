"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface BarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    price: number;
    barcode?: string | null;
    category?: string;
  } | null;
}

export function BarcodeLabelModal({ isOpen, onClose, product }: BarcodeLabelModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const effectiveBarcode = product?.barcode || (product ? `RADHE-${product.id.slice(-6).toUpperCase()}` : "");

  useEffect(() => {
    if (!isOpen || !effectiveBarcode) return;

    QRCode.toDataURL(effectiveBarcode, {
      width: 180,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url: string) => setQrDataUrl(url))
      .catch((err: unknown) => console.error("QR Code generate error:", err));
  }, [isOpen, effectiveBarcode]);

  if (!isOpen || !product) return null;

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Pop-up blocked. Please allow pop-ups to print barcode labels.");
      return;
    }

    const safeName = escapeHtml(product.name);
    const safeBarcode = escapeHtml(effectiveBarcode);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label - ${safeName}</title>
          <style>
            @page {
              size: 50mm 35mm;
              margin: 2mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 4px;
              text-align: center;
              background: white;
              color: black;
            }
            .label-card {
              border: 1px dashed #bbb;
              padding: 6px;
              border-radius: 4px;
              max-width: 180px;
              margin: 0 auto;
            }
            .brand {
              font-size: 10px;
              font-weight: 900;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              color: #111;
            }
            .name {
              font-size: 11px;
              font-weight: 700;
              line-height: 1.2;
              margin: 2px 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .price {
              font-size: 14px;
              font-weight: 900;
              color: #000;
              margin: 2px 0;
            }
            .barcode-img {
              width: 110px;
              height: 110px;
              margin: 0 auto;
              display: block;
            }
            .code-text {
              font-family: monospace;
              font-size: 10px;
              font-weight: bold;
              letter-spacing: 1px;
              margin-top: 1px;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="brand">RADHE GROCERY</div>
            <div class="name">${safeName}</div>
            <div class="price">₹${product.price}</div>
            <img src="${qrDataUrl}" class="barcode-img" alt="Barcode" />
            <div class="code-text">${safeBarcode}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xl border border-zinc-200">
        <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Product Barcode Label</span>
            <h3 className="text-base font-extrabold text-zinc-900">{product.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Label Preview Card */}
        <div className="my-5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-4 sm:p-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Radhe Grocery</span>
          <p className="mt-1 text-sm font-black text-zinc-900 text-center line-clamp-1">{product.name}</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">₹{product.price}</p>

          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="Product QR/Barcode" className="h-32 sm:h-36 w-32 sm:w-36 my-2 rounded-lg border border-zinc-200 bg-white p-1 shadow-xs" />
          ) : (
            <div className="h-32 sm:h-36 w-32 sm:w-36 my-2 flex items-center justify-center bg-zinc-200 rounded-lg animate-pulse">
              Generating…
            </div>
          )}

          <div className="rounded bg-zinc-200 px-3 py-1 font-mono text-xs font-bold tracking-wider text-zinc-800 break-all text-center">
            {effectiveBarcode}
          </div>
          <p className="mt-2 text-[11px] text-zinc-500 text-center">Scannable by camera and laser barcode scanners</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition min-h-[40px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition min-h-[40px]"
          >
            <span>🖨️</span>
            <span>Print Sticky Label</span>
          </button>
        </div>
      </div>
    </div>
  );
}
