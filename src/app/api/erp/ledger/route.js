import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api";
export async function GET() {
    const auth = await requireAuth(["ADMIN"]);
    if (auth instanceof NextResponse)
        return auth;
    try {
        const ledgerAccounts = await prisma.ledgerAccount.findMany({
            orderBy: { code: "asc" },
        });
        const journalEntries = await prisma.journalEntry.findMany({
            take: 20,
            orderBy: { entryDate: "desc" },
            include: {
                postings: {
                    include: { account: true },
                },
            },
        });
        let totalDebit = 0;
        let totalCredit = 0;
        journalEntries.forEach((je) => {
            je.postings.forEach((p) => {
                totalDebit += p.debit;
                totalCredit += p.credit;
            });
        });
        return NextResponse.json({
            ledgerAccounts,
            journalEntries,
            trialBalance: {
                totalDebit: Math.round(totalDebit * 100) / 100,
                totalCredit: Math.round(totalCredit * 100) / 100,
                isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
            },
        });
    }
    catch (error) {
        return NextResponse.json({ error: "Failed to fetch ledger accounts" }, { status: 500 });
    }
}
