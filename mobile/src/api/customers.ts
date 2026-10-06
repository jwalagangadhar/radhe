import { apiClient } from "./client";
import { Customer } from "../types/models";

export async function fetchCustomers(): Promise<Customer[]> {
  const response = await apiClient<{ customers: Customer[] }>("/api/erp/customers");
  return response.customers || [];
}

export async function createCustomer(payload: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  gstNumber?: string;
  creditLimit?: number;
}): Promise<Customer> {
  const response = await apiClient<{ customer: Customer }>("/api/erp/customers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.customer;
}
