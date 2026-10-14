import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";
import { getSession } from "@/lib/auth";
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const barcode = searchParams.get("barcode");
    const activeOnly = searchParams.get("active") !== "false";
    const orderType = searchParams.get("orderType"); // "WEB" | "WALK_IN" | null
    const where = {
        ...(activeOnly ? { active: true } : {}),
        ...(category && category !== "All" ? { category } : {}),
        ...(barcode ? { barcode } : {}),
        ...(search
            ? {
                OR: [
                    { name: { contains: search } },
                    { barcode: { contains: search } },
                ],
            }
            : {}),
        // Filter by availability: show products matching requested channel or BOTH
        ...(orderType === "WEB"
            ? { availability: { in: ["GST", "BOTH", "WEB"] } }
            : orderType === "WALK_IN_GST"
                ? { availability: { in: ["GST", "BOTH", "WEB", "WALK_IN"] } }
                : orderType === "WALK_IN_NONGST"
                    ? { availability: { in: ["NON_GST", "BOTH", "WALK_IN"] } }
                    : orderType === "WALK_IN"
                        ? { availability: { in: ["GST", "NON_GST", "BOTH", "WALK_IN"] } }
                        : {}),
    };
    const products = await prisma.product.findMany({
        where,
        orderBy: [{ category: "asc" }, { name: "asc" }],
        include: {
            parent: { select: { id: true, name: true } },
            variants: { select: { id: true, name: true, price: true, counterPrice: true, counterGstPrice: true, unit: true, bagWeight: true, stock: true } },
        },
    });
    const session = await getSession();
    const isAdmin = session?.role === "ADMIN";
    // Hide internal wholesale cost margins from public visitors and non-admin users
    const sanitizedProducts = products.map((product) => {
        if (!isAdmin) {
            const { costPrice, ...publicProduct } = product;
            return publicProduct;
        }
        return product;
    });
    return NextResponse.json({ products: sanitizedProducts });
}
const productSchema = z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    price: z.number().positive(),
    costPrice: z.number().min(0).optional(),
    webPrice: z.number().min(0).nullable().optional(),
    counterPrice: z.number().min(0).nullable().optional(),
    counterGstPrice: z.number().min(0).nullable().optional(),
    barcode: z.string().nullable().optional(),
    stock: z.number().min(0),
    unpackedStock: z.number().min(0).default(0),
    bagWeight: z.number().positive().default(30),
    minStock: z.number().min(0).optional(),
    maxStock: z.number().min(0).optional(),
    minBulkBags: z.number().int().min(1).optional(),
    maxBulkBags: z.number().int().min(1).optional(),
    unit: z.string().default("kg"),
    image: z.string().optional(),
    active: z.boolean().optional(),
    availability: z.enum(["GST", "NON_GST", "BOTH", "WEB", "WALK_IN"]).default("BOTH"),
    parentId: z.string().nullable().optional(),
});
export async function POST(req) {
    const auth = await requireAuth(["ADMIN"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        const data = productSchema.parse(await req.json());
        const product = await prisma.product.create({ data });
        return NextResponse.json({ product }, { status: 201 });
    }
    catch (err) {
        if (err instanceof z.ZodError)
            return jsonError("Invalid product data");
        return jsonError("Failed to create product", 500);
    }
}
