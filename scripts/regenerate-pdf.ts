import { enqueueBackgroundTasks } from "@/lib/background";
import { prisma } from "@/lib/db";

async function main() {
  const invoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: "INV-2026-0004" },
    include: { order: true, deliveryChallan: true },
  });

  if (!invoice) {
    console.error("Invoice not found.");
    return;
  }

  const challanId = invoice.deliveryChallan?.id || "";
  console.log("Enqueuing background tasks for order:", invoice.orderId);
  await enqueueBackgroundTasks(invoice.orderId, invoice.id, challanId);
  console.log("Done scheduling.");
}

main().catch(console.error);
