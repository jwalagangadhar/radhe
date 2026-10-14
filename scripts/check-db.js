import { prisma } from "@/lib/db";
async function main() {
    const orders = await prisma.order.findMany({
        include: { items: { include: { product: true } } },
    });
    console.log("Total orders in database:", orders.length);
    for (const o of orders) {
        console.log(`Order #${o.orderNumber} - Type: ${o.type} - Status: ${o.status} - Total: ${o.total} - Customer: ${o.customerName}`);
    }
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
