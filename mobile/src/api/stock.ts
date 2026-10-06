import { apiClient } from "./client";
import { StockAdjustment } from "../types/models";

export async function fetchStockAdjustments(): Promise<StockAdjustment[]> {
  try {
    const response = await apiClient<{ adjustments: StockAdjustment[] }>("/api/stock-adjustments");
    return response.adjustments || [];
  } catch {
    return [];
  }
}

export async function createStockAdjustment(payload: {
  productId: string;
  quantity: number;
  reason: string;
  bagCount?: number;
  bagWeight?: number;
}): Promise<any> {
  const response = await apiClient<any>("/api/stock-adjustments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response;
}

export async function fetchStockRequests(): Promise<any[]> {
  try {
    const response = await apiClient<{ requests: any[] }>("/api/stock-requests");
    return response.requests || [];
  } catch {
    return [];
  }
}

export async function createStockRequest(payload: {
  productId: string;
  bagCount: number;
  bagWeight: number;
  totalWeight: number;
  note?: string;
}): Promise<any> {
  const response = await apiClient<any>("/api/stock-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response;
}
