import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeaderBar } from "../../src/components/HeaderBar";
import { LoadingView } from "../../src/components/LoadingView";
import { ErrorView } from "../../src/components/ErrorView";
import { fetchOrderDetails, updateOrderStatus } from "../../src/api/orders";
import { Order, OrderStatus } from "../../src/types/models";
import { formatCurrency, formatDate } from "../../src/utils/formatters";
import { getStatusColor } from "../../src/components/OrderCard";

const ADMIN_STATUS_OPTIONS: OrderStatus[] = [
  "PENDING",
  "APPROVED",
  "PACKING",
  "COMPLETED",
  "CANCELLED",
];

export default function AdminOrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const res = await fetchOrderDetails(id);
      setOrder(res);
    } catch (err: any) {
      setError(err.message || "Failed to load order details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order || order.status === newStatus) return;

    Alert.alert(
      "Confirm Status Update",
      `Are you sure you want to change order #${order.orderNumber} status to ${newStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            setUpdating(true);
            try {
              const updated = await updateOrderStatus(order.id, newStatus);
              setOrder(updated);
              Alert.alert("Success", `Order status updated to ${newStatus}`);
            } catch (err: any) {
              Alert.alert("Update Failed", err.message || "Could not update status");
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <HeaderBar title="Order Details" showBack />
        <LoadingView message="Loading order information..." />
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <HeaderBar title="Order Details" showBack />
        <ErrorView message={error || "Order not found"} onRetry={loadOrder} />
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusColor(order.status);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <HeaderBar title={`Order #${order.orderNumber}`} subtitle={order.type} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status & Timestamp Header Card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.label}>Current Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Text style={[styles.statusText, { color: statusConfig.text }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>
            <View style={styles.alignRight}>
              <Text style={styles.label}>Order Date</Text>
              <Text style={styles.valueBold}>{formatDate(order.createdAt)}</Text>
            </View>
          </View>

          {/* Quick Status Action Buttons for Admin */}
          <Text style={[styles.label, { marginTop: 16 }]}>Change Order Status:</Text>
          <View style={styles.statusButtonsGrid}>
            {ADMIN_STATUS_OPTIONS.map((st) => {
              const isCurrent = order.status === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusBtn, isCurrent && styles.statusBtnActive]}
                  onPress={() => handleStatusChange(st)}
                  disabled={updating || isCurrent}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.statusBtnText, isCurrent && styles.statusBtnTextActive]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {updating && <ActivityIndicator color="#2563eb" style={{ marginTop: 8 }} />}
        </View>

        {/* Customer Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer & Delivery</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Customer Name</Text>
            <Text style={styles.valueBold}>{order.customerName || order.customer?.name || "Walk-in"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Contact Phone</Text>
            <Text style={styles.valueBold}>{order.customerPhone || order.customer?.phone || "-"}</Text>
          </View>
          {order.deliveryAddress && (
            <View style={styles.infoRowStacked}>
              <Text style={styles.label}>Delivery Address</Text>
              <Text style={styles.valueAddress}>{order.deliveryAddress}</Text>
            </View>
          )}
          {order.gstNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>GSTIN</Text>
              <Text style={styles.valueBold}>{order.gstNumber}</Text>
            </View>
          )}
        </View>

        {/* Products & Line Items Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ordered Items ({order.items?.length || 0})</Text>

          {order.items?.map((item, index) => (
            <View key={item.id || index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product?.name || "Product"}</Text>
                <Text style={styles.itemMeta}>
                  Qty: {item.quantity} {item.product?.unit || "units"} × {formatCurrency(item.unitPrice)}
                </Text>
                {item.gstRate ? (
                  <Text style={styles.itemGst}>GST: {item.gstRate}%</Text>
                ) : null}
              </View>
              <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))}

          {/* Pricing Breakdown */}
          <View style={styles.priceSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxable Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(order.totalTaxable)}</Text>
            </View>
            {order.totalCgst > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>CGST</Text>
                <Text style={styles.summaryValue}>{formatCurrency(order.totalCgst)}</Text>
              </View>
            )}
            {order.totalSgst > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SGST</Text>
                <Text style={styles.summaryValue}>{formatCurrency(order.totalSgst)}</Text>
              </View>
            )}
            {order.totalIgst > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>IGST</Text>
                <Text style={styles.summaryValue}>{formatCurrency(order.totalIgst)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(order.total)}</Text>
            </View>
          </View>
        </View>

        {/* ERP & Document References */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enterprise Documents</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Tax Invoice</Text>
            <Text style={styles.valueBold}>
              {order.invoice?.invoiceNumber || "Not generated yet"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Delivery Challan</Text>
            <Text style={styles.valueBold}>
              {order.deliveryChallan?.challanNumber || "None"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alignRight: {
    alignItems: "flex-end",
  },
  label: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  valueBold: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusButtonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  statusBtn: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  statusBtnActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  statusBtnTextActive: {
    color: "#ffffff",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  infoRowStacked: {
    paddingVertical: 8,
  },
  valueAddress: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  itemMeta: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  itemGst: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 1,
  },
  itemSubtotal: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  priceSummary: {
    marginTop: 14,
    paddingTop: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2563eb",
  },
});
