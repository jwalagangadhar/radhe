import { generateDeliveryChallanPdf, generateInvoicePdf, CompanyInfo, InvoicePdfData, ChallanPdfData } from "@/lib/pdf";
import { prisma } from "@/lib/db";
import { sendCustomerInvoiceSms } from "@/lib/notifications";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function enqueueBackgroundTasks(orderId: string, invoiceId: string, challanId: string) {
  // Simulated asynchronous worker execution. Production systems should wire a job queue here.
  setTimeout(async () => {
    try {
      const [company, invoice, challan] = await Promise.all([
        prisma.companySettings.findFirst({ where: { id: "default" } }),
        prisma.invoice.findUnique({
          where: { id: invoiceId },
          include: { order: { include: { items: { include: { product: true } } } }, deliveryChallan: true },
        }),
        prisma.deliveryChallan.findUnique({ where: { id: challanId }, include: { order: true } }),
      ]);

      if (!company || !invoice) {
        console.warn("Background task skipped because required resources were missing.");
        return;
      }

      const invoiceData: InvoicePdfData = {
        invoiceNumber: invoice.invoiceNumber,
        orderNumber: invoice.order.orderNumber,
        invoiceDate: invoice.invoiceDate.toISOString().split("T")[0],
        customerName: invoice.order.customerName ?? "Customer",
        customerPhone: invoice.order.customerPhone ?? "",
        customerAddress: invoice.order.deliveryAddress ?? "",
        placeOfSupply: invoice.placeOfSupply,
        isInterState: invoice.isInterState,
        totalTaxable: invoice.totalTaxable,
        totalCgst: invoice.totalCgst,
        totalSgst: invoice.totalSgst,
        totalIgst: invoice.totalIgst,
        totalTax: invoice.totalCgst + invoice.totalSgst + invoice.totalIgst,
        roundOff: invoice.roundOff,
        grandTotal: invoice.grandTotal,
        items: invoice.order.items.map((item) => ({
          description: item.product.name,
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxableValue: Math.round(item.quantity * item.unitPrice * 100) / 100,
          cgstAmount: item.cgstAmount,
          sgstAmount: item.sgstAmount,
          igstAmount: item.igstAmount,
          total: Math.round((item.quantity * item.unitPrice + item.cgstAmount + item.sgstAmount + item.igstAmount) * 100) / 100,
        })),
        gstNumber: invoice.order.gstNumber ?? undefined,
        qrCodeBase64: undefined,
        challan: challan
          ? {
              challanNumber: challan.challanNumber,
              orderNumber: challan.order.orderNumber,
              dispatchDate: challan.dispatchDate.toISOString().split("T")[0],
              transporterName: challan.transporterName,
              lrNumber: challan.lrNumber,
              vehicleNumber: challan.vehicleNumber,
              destination: challan.destination,
              distanceKm: challan.distanceKm,
              eWayBillNo: challan.eWayBillNo ?? undefined,
              notes: challan.notes ?? undefined,
              customerName: invoice.order.customerName ?? "Customer",
              deliveryAddress: invoice.order.deliveryAddress ?? "",
            }
          : undefined,
      };

      const [invoicePdfBuffer, challanPdfBuffer] = await Promise.all([
        generateInvoicePdf(company, invoiceData),
        challan
          ? generateDeliveryChallanPdf(company, {
              challanNumber: challan.challanNumber,
              orderNumber: challan.order.orderNumber,
              dispatchDate: challan.dispatchDate.toISOString().split("T")[0],
              transporterName: challan.transporterName,
              lrNumber: challan.lrNumber,
              vehicleNumber: challan.vehicleNumber,
              destination: challan.destination,
              distanceKm: challan.distanceKm,
              eWayBillNo: challan.eWayBillNo ?? undefined,
              notes: challan.notes ?? undefined,
              customerName: invoice.order.customerName ?? "Customer",
              deliveryAddress: invoice.order.deliveryAddress ?? "",
            })
          : Promise.resolve(Buffer.from("")),
      ]);

      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      const invoiceDir = path.join(uploadsDir, "invoices");
      const challanDir = path.join(uploadsDir, "challans");
      await mkdir(invoiceDir, { recursive: true });
      await mkdir(challanDir, { recursive: true });

      const invoicePath = path.join(invoiceDir, `${invoice.invoiceNumber}.pdf`);
      await writeFile(invoicePath, invoicePdfBuffer);

      if (challan && challanPdfBuffer.length > 0) {
        const challanPath = path.join(challanDir, `${challan.challanNumber}.pdf`);
        await writeFile(challanPath, challanPdfBuffer);
      }

      await sendCustomerInvoiceSms(invoice.order);

      console.log(`Background jobs completed for order ${orderId} invoice ${invoiceId}`);
    } catch (err) {
      console.error("Background worker failed:", err);
    }
  }, 100);
}
