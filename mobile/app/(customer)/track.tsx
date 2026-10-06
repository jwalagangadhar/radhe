import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { trackCustomerOrder, TrackOrderResponse } from "../../src/api/orders";

const STAGES = [
  { key: "PENDING", label: "Order Received", icon: "clipboard-check-outline" },
  { key: "APPROVED", label: "Wholesale Approved", icon: "check-circle-outline" },
  { key: "PACKING", label: "Godown Packing", icon: "package-variant-closed" },
  { key: "IN_TRANSIT", label: "Dispatched", icon: "truck-fast-outline" },
  { key: "DELIVERED", label: "Delivered", icon: "home-check-outline" },
];

export default function CustomerTrackScreen() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<TrackOrderResponse["order"] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTrack = async () => {
    if (!orderNumber.trim()) {
      setErrorMsg("Please enter your Order Number (e.g. 1001).");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMsg("Please enter the 10-digit phone number used during checkout.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setOrderData(null);

    try {
      const res = await trackCustomerOrder(orderNumber.trim(), cleanPhone);
      if (res.order) {
        setOrderData(res.order);
      } else {
        setErrorMsg("Order not found with these details.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to find order. Please verify Order Number and Phone.");
    } finally {
      setLoading(false);
    }
  };

  const getStageIndex = (status: string) => {
    switch (status) {
      case "PENDING":
      case "DRAFT":
        return 0;
      case "APPROVED":
        return 1;
      case "PACKING":
        return 2;
      case "IN_TRANSIT":
        return 3;
      case "DELIVERED":
      case "INVOICED":
      case "COMPLETED":
        return 4;
      default:
        return 0;
    }
  };

  const currentStageIndex = orderData ? getStageIndex(orderData.status) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Track Wholesale Order</Text>
      <Text style={styles.pageSubtitle}>
        Check live dispatch, packing, and delivery status for Vijayawada shipments.
      </Text>

      {/* Lookup Card */}
      <View style={styles.card}>
        {errorMsg ? (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle" size={18} color="#dc2626" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Order Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1001"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            value={orderNumber}
            onChangeText={setOrderNumber}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Registered Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <TouchableOpacity
          style={[styles.trackBtn, loading && styles.trackBtnDisabled]}
          onPress={handleTrack}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="magnify" size={18} color="#ffffff" />
              <Text style={styles.trackBtnText}>Track Order</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Tracking Results */}
      {orderData && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View>
              <Text style={styles.orderBadge}>Order #{orderData.orderNumber}</Text>
              <Text style={styles.customerName}>{orderData.customerName}</Text>
            </View>
            <View style={styles.totalBadge}>
              <Text style={styles.totalAmount}>₹{orderData.total.toLocaleString("en-IN")}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Timeline */}
          <Text style={styles.timelineTitle}>Dispatch & Delivery Progress</Text>
          <View style={styles.timelineContainer}>
            {STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isFuture = idx > currentStageIndex;

              return (
                <View key={stage.key} style={styles.timelineStep}>
                  <View style={styles.timelineIconCol}>
                    <View
                      style={[
                        styles.timelineCircle,
                        isPast && styles.circlePast,
                        isCurrent && styles.circleCurrent,
                        isFuture && styles.circleFuture,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={stage.icon as any}
                        size={16}
                        color={isFuture ? "#94a3b8" : "#ffffff"}
                      />
                    </View>
                    {idx < STAGES.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          idx < currentStageIndex ? styles.lineActive : styles.lineInactive,
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineTextCol}>
                    <Text
                      style={[
                        styles.stageName,
                        isCurrent && styles.stageNameCurrent,
                        isPast && styles.stageNamePast,
                      ]}
                    >
                      {stage.label}
                    </Text>
                    {isCurrent && (
                      <Text style={styles.stageStatusDesc}>In Progress</Text>
                    )}
                    {isPast && (
                      <Text style={styles.stageStatusDone}>Completed</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Order Items */}
          <View style={styles.itemsSection}>
            <Text style={styles.itemsSectionTitle}>Order Items</Text>
            {orderData.items.map((item, i) => (
              <View key={i} style={styles.orderItemRow}>
                <View style={styles.itemBullet}>
                  <MaterialCommunityIcons name="grain" size={14} color="#b45309" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderItemName}>{item.name}</Text>
                  <Text style={styles.orderItemQty}>{item.quantity} bags</Text>
                </View>
                <Text style={styles.orderItemPrice}>
                  ₹{item.subtotal.toLocaleString("en-IN")}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    padding: 10,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "600",
    flex: 1,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
  },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#b45309",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
  },
  trackBtnDisabled: {
    opacity: 0.7,
  },
  trackBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  resultCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 14,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderBadge: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
  },
  customerName: {
    fontSize: 13,
    color: "#64748b",
  },
  totalBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: "900",
    color: "#78350f",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 4,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineStep: {
    flexDirection: "row",
    minHeight: 52,
  },
  timelineIconCol: {
    alignItems: "center",
    width: 32,
  },
  timelineCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  circlePast: {
    backgroundColor: "#059669",
  },
  circleCurrent: {
    backgroundColor: "#d97706",
  },
  circleFuture: {
    backgroundColor: "#e2e8f0",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  lineActive: {
    backgroundColor: "#059669",
  },
  lineInactive: {
    backgroundColor: "#e2e8f0",
  },
  timelineTextCol: {
    flex: 1,
    paddingLeft: 12,
    paddingTop: 3,
  },
  stageName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  stageNameCurrent: {
    color: "#b45309",
    fontWeight: "800",
  },
  stageNamePast: {
    color: "#0f172a",
  },
  stageStatusDesc: {
    fontSize: 11,
    color: "#d97706",
    fontWeight: "600",
  },
  stageStatusDone: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
  },
  itemsSection: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  itemsSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
  },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemBullet: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
  },
  orderItemQty: {
    fontSize: 11,
    color: "#64748b",
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
});
