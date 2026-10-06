import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api";

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // wrap in quotes and escape quotes
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(type ? { type: type as never } : {}),
    },
    include: { items: { include: { product: true } }, createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "Order Number",
    "Type",
    "Status",
    "Customer Name",
    "Customer Phone",
    "Delivery Address",
    "GST Number",
    "Total",
    "Created At",
    "Created By",
    "Items",
  ];

  const rows = [header.map(csvEscape).join(",")];

  for (const o of orders) {
    const items = (o.items || [])
      .map((it) => `${it.product.name} x ${it.quantity} ${it.product.unit} (₹${it.subtotal.toFixed(2)})`)
      .join(" | ");

    const row = [
      o.orderNumber,
      o.type,
      o.status,
      o.customerName ?? "",
      o.customerPhone ?? "",
      o.deliveryAddress ?? "",
      o.gstNumber ?? "",
      o.total.toFixed(2),
      o.createdAt.toISOString(),
      o.createdBy?.name ?? "",
      items,
    ];
    rows.push(row.map(csvEscape).join(","));
  }

  const csv = rows.join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders.csv"`,
    },
  });
}
