export type Role = "ADMIN" | "WORKER";

export type OrderType = "WEB" | "WALK_IN";

export type OrderStatus =
  | "PENDING"
  | "DRAFT"
  | "APPROVED"
  | "PACKING"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "INVOICED"
  | "COMPLETED"
  | "CANCELLED";

export interface SessionUser {
  id: string;
  username: string;
  email?: string | null;
  name: string;
  role: Role;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state: string;
  stateCode: string;
  gstNumber?: string | null;
  creditLimit: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  counterPrice?: number | null;
  counterGstPrice?: number | null;
  unit: string;
  bagWeight?: number | null;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice?: number; // Only returned for ADMIN
  webPrice?: number | null;
  counterPrice?: number | null;
  counterGstPrice?: number | null;
  stock: number;
  unpackedStock: number;
  minStock: number;
  maxStock: number;
  bagWeight?: number | null;
  minBulkBags: number;
  maxBulkBags: number;
  unit: string;
  image?: string | null;
  active: boolean;
  availability: "GST" | "NON_GST" | "BOTH" | "WEB" | "WALK_IN";
  hsnCode?: string;
  gstRate: number;
  barcode?: string | null;
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  subtotal: number;
  product?: Product;
}

export interface Order {
  id: string;
  orderNumber: number;
  type: OrderType;
  status: OrderStatus;
  customerId?: string | null;
  customer?: Customer | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  customerStateCode?: string;
  placeOfSupply?: string;
  gstNumber?: string | null;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  total: number;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: { id: string; name: string } | null;
  approvedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  invoice?: { invoiceNumber: string } | null;
  deliveryChallan?: { challanNumber: string } | null;
}

export interface DashboardStats {
  todaySales: number;
  todayProfit: number;
  todayPurchases: number;
  todayOrderCount: number;
  pendingWebOrders: number;
  draftWalkInOrders: number;
  currentWeekSales: number;
  currentMonthSales: number;
  monthProfit: number;
  monthPurchases: number;
}

export interface StockSummary {
  totalProducts: number;
  totalStockQuantity: number;
  totalStockValue: number;
  totalCostValue: number;
  lowStockCount: number;
}

export interface DashboardData {
  stats: DashboardStats;
  stockSummary: StockSummary;
  sales: {
    daily: { date: string; label: string; total: number }[];
    weekly: { date: string; label: string; total: number }[];
    monthly: { date: string; label: string; total: number }[];
  };
  stock: {
    topProducts: { name: string; stock: number }[];
  };
  recentOrders: Order[];
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  invoiceDate: string;
  placeOfSupply: string;
  isInterState: boolean;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  discountAmount: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  paidAmount: number;
  smsSent: boolean;
  order?: Order;
}

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  orderId: string;
  transporterName: string;
  lrNumber: string;
  vehicleNumber: string;
  dispatchDate: string;
  destination: string;
  distanceKm: number;
  eWayBillNo?: string | null;
  status: string;
  order?: Order;
}

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  group: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  balance: number;
  active: boolean;
}

export interface ErpMetrics {
  dailySales: number;
  todayOrderCount: number;
  pendingOrdersCount: number;
  totalReceivables: number;
  gstLiabilities: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
  ledgerSummary: LedgerAccount[];
  recentOrders: Order[];
}

export interface WorkerUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  active: boolean;
  phone?: string | null;
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  bagCount?: number | null;
  bagWeight?: number | null;
  reason: string;
  createdAt: string;
}
