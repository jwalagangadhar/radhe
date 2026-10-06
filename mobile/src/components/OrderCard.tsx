import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Order, OrderStatus } from "../types/models";
import { formatCurrency, formatDate } from "../utils/formatters";

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  showWorkerAction?: boolean;
  onWorkerPack?: () => void;
}

export function getStatusColor(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return { bg: "#fef3c7", text: "#92400e", label: "Pending" };
    case "APPROVED":
      return { bg: "#e0e7ff", text: "#3730a3", label: "Approved" };
    case "PACKING":
      return { bg: "#ffedd5", text: "#9a3412", label: "Packing" };
    case "IN_TRANSIT":
      return { bg: "#e0f2fe", text: "#0369a1", label: "In Transit" };
    case "DELIVERED":
    case "COMPLETED":
      return { bg: "#dcfce7", text: "#166534", label: "Completed" };
    case "CANCELLED":
      return { bg: "#fee2e2", text: "#991b1b", label: "Cancelled" };
    case "DRAFT":
      return { bg: "#f1f5f9", text: "#475569", label: "Draft" };
    default:
      return { bg: "#f1f5f9", text: "#475569", label: status };
  }
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onPress,
  showWorkerAction = false,
  onWorkerPack,
}) => {
  const statusConfig = getStatusColor(order.status);
  const customerDisplay =
    order.customerName ||
    order.customer?.name ||
    (order.customerPhone ? `Phone: ${order.customerPhone}` : "Walk-in Customer");

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNumber}, Status ${statusConfig.label}, Amount ${formatCurrency(order.total)}`}
    >
      <View style={styles.topRow}>
        <View style={styles.orderIdGroup}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <View style={[styles.typeBadge, order.type === "WEB" ? styles.webBadge : styles.walkInBadge]}>
            <Text style={styles.typeText}>{order.type}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.statusText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
        </View>
      </View>

      <View style={styles.middleRow}>
        <MaterialCommunityIcons name="account-outline" size={16} color="#64748b" style={styles.icon} />
        <Text style={styles.customerName} numberOfLines={1}>
          {customerDisplay}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.dateGroup}>
          <MaterialCommunityIcons name="clock-outline" size={14} color="#94a3b8" />
          <Text style={styles.dateText}>{formatDate(order.createdAt)}</Text>
        </View>
        <Text style={styles.itemsCount}>
          {order.items?.length || 0} {order.items?.length === 1 ? "item" : "items"}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>{formatCurrency(order.total)}</Text>
        </View>

        {showWorkerAction && order.status === "APPROVED" && (
          <TouchableOpacity
            style={styles.packButton}
            onPress={(e) => {
              e.stopPropagation();
              if (onWorkerPack) onWorkerPack();
            }}
            accessibilityRole="button"
            accessibilityLabel="Start packing order"
          >
            <MaterialCommunityIcons name="package-variant" size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.packButtonText}>Start Pack</Text>
          </TouchableOpacity>
        )}

        <View style={styles.chevron}>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderIdGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderNumber: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  webBadge: {
    backgroundColor: "#e0f2fe",
  },
  walkInBadge: {
    backgroundColor: "#f1f5f9",
  },
  typeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0369a1",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  icon: {
    marginRight: 6,
  },
  customerName: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dateGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  itemsCount: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  totalLabel: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  packButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d97706",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 44,
  },
  packButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  chevron: {
    justifyContent: "center",
    alignItems: "center",
    height: 36,
  },
});
