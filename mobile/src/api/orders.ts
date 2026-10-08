import { apiClient } from "./client";
import { Order, OrderStatus, OrderType } from "../types/models";

export interface GetOrdersParams {
  status?: OrderStatus;
  type?: OrderType;
  queue?: boolean;
}

export interface UpdateOrderPayload {
  status?: OrderStatus;
  total?: number;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
}

export async function fetchOrders(params: GetOrdersParams = {}): Promise<Order[]> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.type) query.set("type", params.type);
  if (params.queue) query.set("queue", "true");

  const qs = query.toString();
  const endpoint = `/api/orders${qs ? `?${qs}` : ""}`;
  const response = await apiClient<{ orders: Order[] }>(endpoint);
  return response.orders || [];
}

export async function fetchOrderDetails(orderId: string): Promise<Order> {
  const response = await apiClient<{ order: Order }>(`/api/orders/${orderId}`);
  return response.order;
}

/**
 * Worker / Admin updates order status (e.g. PACKING, COMPLETED)
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  const response = await apiClient<{ order: Order }>(`/api/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return response.order;
}

/**
 * Admin updates order details (status, notes, total, customer)
 */
export async function updateOrderAdmin(orderId: string, payload: UpdateOrderPayload): Promise<Order> {
  const response = await apiClient<{ order: Order }>(`/api/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return response.order;
}

export interface CustomerCheckoutItem {
  productId: string;
  quantity: number;
}

export interface CustomerCheckoutPayload {
  shopName: string;
  shopPhone: string;
  shopAddress: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  customerStateCode?: string;
  placeOfSupply?: string;
  transporterName?: string;
  items: CustomerCheckoutItem[];
}

export interface CheckoutResponse {
  message?: string;
  orderNumber: number;
  invoiceNumber?: string;
  challanNumber?: string;
}

export async function createCustomerCheckout(payload: CustomerCheckoutPayload): Promise<CheckoutResponse> {
  return apiClient<CheckoutResponse>("/api/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: false,
  });
}

export interface TrackOrderResponse {
  order: {
    orderNumber: number;
    status: OrderStatus;
    customerName: string;
    createdAt: string;
    approvedAt?: string | null;
    completedAt?: string | null;
    total: number;
    type: string;
    items: Array<{
      name: string;
      quantity: number;
      unit: string;
      price: number;
      subtotal: number;
      image?: string | null;
    }>;
  };
}

export async function trackCustomerOrder(orderNumber: string | number, phone: string): Promise<TrackOrderResponse> {
  const cleanPhone = phone.replace(/\D/g, "");
  return apiClient<TrackOrderResponse>(`/api/orders/track?orderNumber=${orderNumber}&phone=${encodeURIComponent(cleanPhone)}`, {
    skipAuth: true,
  });
}

