import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCart } from "../../src/context/CartContext";
import { createCustomerCheckout } from "../../src/api/orders";

export default function CustomerCartScreen() {
  const router = useRouter();
  const { items, updateQuantity, removeFromCart, clearCart, totalBags, totalAmount } = useCart();

  const [shopName, setShopName] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<{ orderNumber: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!shopName.trim()) {
      setErrorMsg("Please enter your Shop or Business Name.");
      return;
    }
    const cleanPhone = shopPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!shopAddress.trim() || shopAddress.trim().length < 5) {
      setErrorMsg("Please enter a detailed delivery address.");
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        shopName: shopName.trim(),
        shopPhone: cleanPhone,
        shopAddress: shopAddress.trim(),
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const res = await createCustomerCheckout(payload);
      if (res.orderNumber) {
        setSuccessOrder({
          orderNumber: res.orderNumber,
          total: totalAmount,
        });
        clearCart();
      } else {
        setErrorMsg(res.message || "Failed to place order. Please try again.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Could not connect to wholesale ordering service.");
    } finally {
      setSubmitting(false);
    }
  };

  if (successOrder) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconCircle}>
          <MaterialCommunityIcons name="check-decagram" size={64} color="#059669" />
        </View>
        <Text style={styles.successTitle}>Wholesale Order Placed!</Text>
        <Text style={styles.successOrderNum}>Order #{successOrder.orderNumber}</Text>
        <Text style={styles.successDesc}>
          Our wholesale godown has received your order for ₹{successOrder.total.toLocaleString("en-IN")}.
          We will contact you shortly to confirm transport and dispatch.
        </Text>

        <TouchableOpacity
          style={styles.trackNavBtn}
          onPress={() => {
            setSuccessOrder(null);
            router.push("/(customer)/track");
          }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="truck-fast-outline" size={20} color="#ffffff" />
          <Text style={styles.trackNavBtnText}>Track This Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backCatalogBtn}
          onPress={() => {
            setSuccessOrder(null);
            router.push("/(customer)/catalog" as any);
          }}
        >
          <Text style={styles.backCatalogBtnText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBg}>
          <MaterialCommunityIcons name="cart-outline" size={64} color="#cbd5e1" />
        </View>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyDesc}>
          Add sealed wholesale bags of rice, dals, atta, and grains to place an order.
        </Text>
        <TouchableOpacity
          style={styles.shopNowBtn}
          onPress={() => router.push("/(customer)/catalog" as any)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="storefront" size={18} color="#ffffff" />
          <Text style={styles.shopNowBtnText}>Browse Wholesale Catalog</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.sectionTitle}>Wholesale Cart ({totalBags} Bags)</Text>

      {/* Cart Items List */}
      <View style={styles.cartList}>
        {items.map((item) => (
          <View key={item.product.id} style={styles.cartItem}>
            <View style={styles.cartItemHeader}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.bagWeight}kg Sealed Bag · ₹{item.unitPrice.toLocaleString("en-IN")}/bag
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removeFromCart(item.product.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.cartItemFooter}>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                >
                  <MaterialCommunityIcons name="minus" size={16} color="#78350f" />
                </TouchableOpacity>
                <Text style={styles.stepperQty}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                >
                  <MaterialCommunityIcons name="plus" size={16} color="#78350f" />
                </TouchableOpacity>
              </View>

              <Text style={styles.itemTotal}>
                ₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Order Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Wholesale Bags</Text>
          <Text style={styles.summaryVal}>{totalBags} bags</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Sortex Cleaning & Bagging</Text>
          <Text style={styles.freeTag}>FREE</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Estimated Total</Text>
          <Text style={styles.totalVal}>₹{totalAmount.toLocaleString("en-IN")}</Text>
        </View>
      </View>

      {/* Checkout Form */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Delivery & Business Details</Text>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle" size={18} color="#dc2626" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Shop or Business Name *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Sri Krishna Supermarket"
            placeholderTextColor="#94a3b8"
            value={shopName}
            onChangeText={setShopName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Contact Phone Number *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="10-digit mobile number"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            maxLength={10}
            value={shopPhone}
            onChangeText={setShopPhone}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Delivery Address *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Street address, Market, Landmark, City/Town"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            value={shopAddress}
            onChangeText={setShopAddress}
          />
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, submitting && styles.checkoutBtnDisabled]}
          onPress={handleCheckout}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <MaterialCommunityIcons name="truck-delivery" size={20} color="#ffffff" />
              <Text style={styles.checkoutBtnText}>Place Wholesale Order</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },
  cartList: {
    gap: 10,
  },
  cartItem: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cartItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 12,
    color: "#64748b",
  },
  cartItemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stepperQty: {
    fontSize: 13,
    fontWeight: "800",
    color: "#78350f",
    paddingHorizontal: 8,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  freeTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#059669",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  totalVal: {
    fontSize: 20,
    fontWeight: "900",
    color: "#b45309",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 4,
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
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  textInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
  },
  textArea: {
    height: 72,
    textAlignVertical: "top",
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#b45309",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 6,
  },
  checkoutBtnDisabled: {
    opacity: 0.7,
  },
  checkoutBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  shopNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#b45309",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  shopNowBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  successContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  successIconCircle: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#065f46",
    marginBottom: 4,
  },
  successOrderNum: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  successDesc: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 320,
  },
  trackNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#b45309",
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 24,
    gap: 8,
    marginBottom: 12,
  },
  trackNavBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  backCatalogBtn: {
    paddingVertical: 8,
  },
  backCatalogBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
});
