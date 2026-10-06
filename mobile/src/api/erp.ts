import { apiClient } from "./client";
import {
  DashboardData,
  ErpMetrics,
  Invoice,
  DeliveryChallan,
  LedgerAccount,
  WorkerUser,
} from "../types/models";

export async function fetchDashboardData(): Promise<DashboardData> {
  return await apiClient<DashboardData>("/api/dashboard");
}

export async function fetchErpMetrics(): Promise<ErpMetrics> {
  return await apiClient<ErpMetrics>("/api/erp/metrics");
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const response = await apiClient<{ invoices: Invoice[] }>("/api/erp/invoices");
  return response.invoices || [];
}

export async function fetchDeliveryChallans(): Promise<DeliveryChallan[]> {
  const response = await apiClient<{ challans: DeliveryChallan[] }>("/api/erp/transport");
  return response.challans || [];
}

export async function fetchPayments(): Promise<any[]> {
  const response = await apiClient<{ payments: any[] }>("/api/erp/payments");
  return response.payments || [];
}

export async function fetchLedger(): Promise<{
  ledgerAccounts: LedgerAccount[];
  journalEntries: any[];
  trialBalance: { totalDebit: number; totalCredit: number; isBalanced: boolean };
}> {
  return await apiClient<any>("/api/erp/ledger");
}

export async function fetchCompliance(type: "gstr1" | "gstr3b" | "ewaybill" | "einvoice", invoiceId?: string): Promise<any> {
  const query = new URLSearchParams();
  query.set("type", type);
  if (invoiceId) query.set("invoiceId", invoiceId);
  return await apiClient<any>(`/api/erp/compliance?${query.toString()}`);
}

export async function fetchWorkers(): Promise<WorkerUser[]> {
  const response = await apiClient<{ users: WorkerUser[] }>("/api/workers");
  return response.users || [];
}

export async function createWorker(payload: {
  username: string;
  name: string;
  password: string;
  role: "WORKER" | "ADMIN";
  phone?: string;
}): Promise<WorkerUser> {
  const response = await apiClient<{ user: WorkerUser }>("/api/workers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.user;
}

export async function updateWorker(payload: {
  id: string;
  name?: string;
  role?: "WORKER" | "ADMIN";
  active?: boolean;
  phone?: string;
  password?: string;
}): Promise<WorkerUser> {
  const response = await apiClient<{ user: WorkerUser }>("/api/workers", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return response.user;
}
