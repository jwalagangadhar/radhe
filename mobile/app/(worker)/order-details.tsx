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
import { formatDate } from "../../src/utils/formatters";
import { getStatusColor } from "../../src/components/OrderCard";

export default function WorkerOrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local checklist state for items being packed
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

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

  const toggleCheck = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleUpdateStatus = async (status: OrderStatus) => {
    if (!order) return;

    setUpdating(true);
    try {
      const updated = await updateOrderStatus(order.id, status);
      setOrder(updated);
      Alert.alert("Success", `Fulfillment status changed to ${status}`);
    } catch (err: any) {
      Alert.alert("Update Error", err.message || "Worker action not permitted by server");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <HeaderBar title="Order Fulfillment" showBack />
        <LoadingView message="Loading order fulfillment details..." />
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <HeaderBar title="Order Fulfillment" showBack />
        <ErrorView message={error || "Order not found"} onRetry={loadOrder} />
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusColor(order.status);
  const totalItems = order.items?.length || 0;
  const packedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <HeaderBar title={`Pack Order #${order.orderNumber}`} subtitle="Worker Fulfillment View" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Header */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.label}>Status</Text>
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

          {/* Worker Allowed Actions: Start Packing */}
          <View style={styles.actionSection}>
            <Text style={styles.label}>Worker Packing Actions:</Text>
            <View style={styles.actionsRow}>
              {order.status === "APPROVED" && (
                <TouchableOpacity
                  style={[styles.workerActionBtn, styles.startPackBtn]}
                  onPress={() => handleUpdateStatus("PACKING")}
                  disabled={updating}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="package-variant" size={18} color="#ffffff" />
                  <Text style={styles.workerActionText}>Mark PACKING</Text>
                </TouchableOpacity>
              )}

              {order.status === "PACKING" && (
                <TouchableOpacity
                  style={[styles.workerActionBtn, styles.donePackBtn]}
                  onPress={() => {
                    Alert.alert(
                      "Complete Packing",
                      "Have all products and bags been assembled, weighted, and packed?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Confirm Packed",
                          onPress: () => handleUpdateStatus("PACKING"),
                        },
                      ]
                    );
                  }}
                  disabled={updating}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="check-circle" size={18} color="#ffffff" />
                  <Text style={styles.workerActionText}>Items Verified & Packed</Text>
                </TouchableOpacity>
              )}
            </View>
            {updating && <ActivityIndicator color="#d97706" style={{ marginTop: 8 }} />}
          </View>
        </View>

        {/* Packing Checklist Card */}
        <View style={styles.card}>
          <View style={styles.checklistHeader}>
            <Text style={styles.cardTitle}>Items Checklist</Text>
            <Text style={styles.checklistProgress}>
              {packedCount} / {totalItems} verified
            </Text>
          </View>

          {order.items?.map((item, index) => {
            const isChecked = !!checkedItems[item.id];
            return (
              <TouchableOpacity
                key={item.id || index}
                style={[styles.checkItemRow, isChecked && styles.checkItemRowActive]}
                onPress={() => toggleCheck(item.id)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked }}
              >
                <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                  {isChecked && <MaterialCommunityIcons name="check" size={16} color="#ffffff" />}
                </View>

                <View style={styles.itemDetails}>
                  <Text style={[styles.itemName, isChecked && styles.itemNameChecked]}>
                    {item.product?.name || "Product"}
                  </Text>
                  <Text style={styles.itemCategory}>{item.product?.category}</Text>
                </View>

                <View style={styles.quantityBox}>
                  <Text style={styles.qtyNumber}>{item.quantity}</Text>
                  <Text style={styles.qtyUnit}>{item.product?.unit || "kg"}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Customer Delivery Details for Worker Dispatch */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fulfillment Destination</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Customer</Text>
            <Text style={styles.valueBold}>{order.customerName || order.customer?.name || "Walk-in"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Contact</Text>
            <Text style={styles.valueBold}>{order.customerPhone || order.customer?.phone || "-"}</Text>
          </View>
          {order.deliveryAddress ? (
            <View style={styles.infoRowStacked}>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.valueAddress}>{order.deliveryAddress}</Text>
            </View>
          ) : null}
          {order.notes ? (
            <View style={styles.infoRowStacked}>
              <Text style={styles.label}>Order Notes</Text>
              <Text style={styles.valueAddress}>{order.notes}</Text>
            </View>
          ) : null}
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
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  workerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 44,
    gap: 6,
    justifyContent: "center",
    flex: 1,
  },
  startPackBtn: {
    backgroundColor: "#d97706",
  },
  donePackBtn: {
    backgroundColor: "#16a34a",
  },
  workerActionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  checklistHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  checklistProgress: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563eb",
  },
  checkItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  checkItemRowActive: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    backgroundColor: "#ffffff",
  },
  checkboxActive: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  itemNameChecked: {
    textDecorationLine: "line-through",
    color: "#64748b",
  },
  itemCategory: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  quantityBox: {
    alignItems: "flex-end",
  },
  qtyNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  qtyUnit: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
});
