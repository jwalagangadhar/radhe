import { apiClient } from "./client";
import { Product } from "../types/models";

export interface GetProductsParams {
  category?: string;
  search?: string;
  barcode?: string;
  active?: boolean;
  orderType?: "WEB" | "WALK_IN" | "WALK_IN_GST" | "WALK_IN_NONGST";
}

export async function fetchProducts(params: GetProductsParams = {}): Promise<Product[]> {
  const query = new URLSearchParams();
  if (params.category && params.category !== "All") query.set("category", params.category);
  if (params.search) query.set("search", params.search);
  if (params.barcode) query.set("barcode", params.barcode);
  if (params.active !== undefined) query.set("active", String(params.active));
  if (params.orderType) query.set("orderType", params.orderType);

  const qs = query.toString();
  const endpoint = `/api/products${qs ? `?${qs}` : ""}`;
  const response = await apiClient<{ products: Product[] }>(endpoint);
  return response.products || [];
}

export async function createProduct(payload: Partial<Product>): Promise<Product> {
  const response = await apiClient<{ product: Product }>("/api/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.product;
}

export async function updateProduct(id: string, payload: Partial<Product>): Promise<Product> {
  const response = await apiClient<{ product: Product }>(`/api/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return response.product;
}

export async function deleteProduct(id: string): Promise<boolean> {
  await apiClient<{ ok: boolean }>(`/api/products/${id}`, {
    method: "DELETE",
  });
  return true;
}
