import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = prisma;
/** Ensures default admin, worker, and initial products exist on fresh hosted deployments */
export async function ensureDefaultData() {
    try {
        const userCount = await prisma.user.count();
        if (userCount === 0) {
            const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
            const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
            const workerEmail = (process.env.WORKER_EMAIL || "worker@example.com").toLowerCase().trim();
            const workerPassword = process.env.WORKER_PASSWORD || "worker123";
            const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
            const hashedWorkerPassword = await bcrypt.hash(workerPassword, 10);
            await prisma.user.createMany({
                data: [
                    {
                        username: "admin",
                        email: adminEmail,
                        password: hashedAdminPassword,
                        name: "System Admin",
                        role: "ADMIN",
                    },
                    {
                        username: "worker",
                        email: workerEmail,
                        password: hashedWorkerPassword,
                        name: "Store Worker",
                        role: "WORKER",
                    },
                ],
            });
            console.log("✅ Auto-seeded default admin and worker users.");
        }
        const prodCount = await prisma.product.count();
        if (prodCount === 0) {
            await prisma.product.createMany({
                data: [
                    {
                        name: "M-30 Grade Refined Sugar",
                        category: "Sweeteners",
                        price: 43,
                        costPrice: 38,
                        stock: 1000,
                        unpackedStock: 500,
                        bagWeight: 50,
                        unit: "kg",
                        hsnCode: "17019990",
                        gstRate: 5,
                        availability: "BOTH",
                    },
                    {
                        name: "Premium Royal Basmati Rice",
                        category: "Rice",
                        price: 72,
                        costPrice: 56,
                        stock: 800,
                        unpackedStock: 300,
                        bagWeight: 25,
                        unit: "kg",
                        hsnCode: "10063020",
                        gstRate: 5,
                        availability: "BOTH",
                    },
                    {
                        name: "Sharbati Whole Wheat Atta",
                        category: "Atta & Grains",
                        price: 33,
                        costPrice: 26,
                        stock: 1200,
                        unpackedStock: 600,
                        bagWeight: 50,
                        unit: "kg",
                        hsnCode: "11010000",
                        gstRate: 5,
                        availability: "BOTH",
                    },
                    {
                        name: "Desi Unpolished Toor Dal",
                        category: "Dals",
                        price: 110,
                        costPrice: 92,
                        stock: 600,
                        unpackedStock: 200,
                        bagWeight: 30,
                        unit: "kg",
                        hsnCode: "07136000",
                        gstRate: 5,
                        availability: "BOTH",
                    },
                ],
            });
            console.log("✅ Auto-seeded default products.");
        }
    }
    catch (err) {
        console.error("Auto-seed check warning:", err);
    }
}
