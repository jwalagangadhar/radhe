import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCart } from "../../src/context/CartContext";
import { useAuth } from "../../src/context/AuthContext";
import { createCustomerCheckout } from "../../src/api/orders";

export default function CustomerCartScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, updateQuantity, removeFromCart, clearCart, totalBags, totalAmount } = useCart();

  // Checkout Form matching website fields
  const [shopName, setShopName] = useState(user?.name || "");
  const [shopPhone, setShopPhone] = useState(user?.phone || user?.username || "");
  const [email, setEmail] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [city, setCity] = useState("Vijayawada");
  const [state, setState] = useState("Andhra Pradesh");
  const [pincode, setPincode] = useState("520001");
  const [transporterName, setTransporterName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<{
    orderNumber: number;
    total: number;
    invoiceNumber?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync user details when auth loads
  useEffect(() => {
    if (user) {
      if (!shopName && user.name) setShopName(user.name);
      if (!shopPhone && (user.phone || user.username)) {
        setShopPhone(user.phone || user.username);
      }
    }
  }, [user]);

  // Tax calculations matching GST backend
  const cgstAmount = Math.round(totalAmount * 0.025);
  const sgstAmount = Math.round(totalAmount * 0.025);
  const totalGst = cgstAmount + sgstAmount;
  const grandTotal = totalAmount + totalGst;

  const isCustomerLoggedIn = Boolean(user && user.role === "CUSTOMER");

  const handleCheckout = async () => {
    if (!isCustomerLoggedIn) {
      setErrorMsg("Please log in with your Mobile OTP first to place wholesale orders.");
      return;
    }
    if (!shopName.trim()) {
      setErrorMsg("Please enter your Shop or Customer Name.");
      return;
    }
    const cleanPhone = shopPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!shopAddress.trim() || shopAddress.trim().length < 5) {
      setErrorMsg("Please enter a detailed delivery address (at least 5 characters).");
      return;
    }
    if (!city.trim()) {
      setErrorMsg("Please enter City or Town.");
      return;
    }
    if (!pincode.trim() || pincode.trim().length < 6) {
      setErrorMsg("Please enter a valid 6-digit PIN code.");
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        shopName: shopName.trim(),
        shopPhone: cleanPhone,
        shopAddress: shopAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        email: email.trim() || undefined,
        gstNumber: gstNumber.trim().toUpperCase() || undefined,
        customerStateCode: "37",
        placeOfSupply: "37-Andhra Pradesh",
        transporterName: transporterName.trim() || undefined,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const res = await createCustomerCheckout(payload);
      if (res.orderNumber) {
        setSuccessOrder({
          orderNumber: res.orderNumber,
          total: grandTotal,
          invoiceNumber: res.invoiceNumber,
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
        {successOrder.invoiceNumber ? (
          <Text style={styles.successInvoiceNum}>Tax Invoice: {successOrder.invoiceNumber}</Text>
        ) : null}
        <Text style={styles.successDesc}>
          Our wholesale godown has received your order for ₹{successOrder.total.toLocaleString("en-IN")}{" "}
          (incl. 5% GST). We will contact you shortly to confirm transport and dispatch.
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
                  {item.bagWeight}kg Bag · ₹{item.unitPrice.toLocaleString("en-IN")}/bag
                </Text>
                <View style={styles.itemBadgeRow}>
                  <Text style={styles.itemGstBadge}>GST {item.product.gstRate || 5}%</Text>
                  <Text style={styles.itemHsnBadge}>HSN: {item.product.hsnCode || "1006"}</Text>
                </View>
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

      {/* Complete GST Order Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeaderRow}>
          <Text style={styles.summaryTitle}>GST Order Summary</Text>
          <View style={styles.gstTag}>
            <Text style={styles.gstTagText}>B2B Tax Invoice</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Wholesale Bags</Text>
          <Text style={styles.summaryVal}>{totalBags} bags</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Taxable Base Subtotal</Text>
          <Text style={styles.summaryVal}>₹{totalAmount.toLocaleString("en-IN")}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>CGST (2.5%)</Text>
          <Text style={styles.taxSubVal}>+₹{cgstAmount.toLocaleString("en-IN")}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>SGST (2.5%)</Text>
          <Text style={styles.taxSubVal}>+₹{sgstAmount.toLocaleString("en-IN")}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Sortex Cleaning & Bagging</Text>
          <Text style={styles.freeTag}>FREE</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.totalLabel}>Total Payable (Incl. GST)</Text>
            <Text style={styles.totalSubtext}>Includes 5% GST tax breakdown</Text>
          </View>
          <Text style={styles.totalVal}>₹{grandTotal.toLocaleString("en-IN")}</Text>
        </View>
      </View>

      {/* Customer Authentication Status Banner */}
      {!isCustomerLoggedIn ? (
        <View style={styles.authBanner}>
          <View style={styles.authBannerIcon}>
            <MaterialCommunityIcons name="cellphone-key" size={24} color="#b45309" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.authBannerTitle}>Mobile OTP Login Required</Text>
            <Text style={styles.authBannerDesc}>
              Log in with your 10-digit Indian mobile number to complete checkout and link order tracking.
            </Text>
            <TouchableOpacity
              style={styles.authBannerBtn}
              onPress={() => router.push("/login")}
              activeOpacity={0.8}
            >
              <Text style={styles.authBannerBtnText}>Login with Mobile OTP →</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.verifiedBanner}>
          <MaterialCommunityIcons name="check-circle" size={20} color="#16a34a" />
          <View style={{ flex: 1 }}>
            <Text style={styles.verifiedTitle}>
              Verified Customer: {user?.name || "Wholesale Partner"}
            </Text>
            <Text style={styles.verifiedPhone}>Mobile: +91 {user?.phone || user?.username}</Text>
          </View>
        </View>
      )}

      {/* Checkout Form */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Delivery & GST Business Details</Text>
        <Text style={styles.formSubtitle}>
          Enter delivery address and optional GSTIN for official e-Invoice and delivery challan.
        </Text>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle" size={18} color="#dc2626" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Customer / Shop Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Customer / Shop Name *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Ramesh Kumar / Sri Krishna Traders"
            placeholderTextColor="#94a3b8"
            value={shopName}
            onChangeText={setShopName}
          />
        </View>

        {/* Contact Mobile */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Contact Mobile Number * {isCustomerLoggedIn ? "(Verified)" : ""}
          </Text>
          <View style={styles.phoneInputWrapper}>
            <Text style={styles.phonePrefix}>+91</Text>
            <TextInput
              style={[styles.textInput, styles.phoneInput]}
              placeholder="10-digit mobile number"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              maxLength={10}
              value={shopPhone}
              onChangeText={setShopPhone}
              editable={!isCustomerLoggedIn}
            />
          </View>
        </View>

        {/* Email & GST Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email Address (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. billing@example.com"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelWithHint}>
            <Text style={styles.inputLabel}>GST Number (Optional)</Text>
            <Text style={styles.hintText}>For input tax credit</Text>
          </View>
          <TextInput
            style={[styles.textInput, styles.monoInput]}
            placeholder="e.g. 37AAAAA0000A1Z5"
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
            maxLength={15}
            value={gstNumber}
            onChangeText={(val) => setGstNumber(val.toUpperCase())}
          />
        </View>

        {/* Delivery Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Delivery Address *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Shop/Premises No, Street, Market, Landmark"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={2}
            value={shopAddress}
            onChangeText={setShopAddress}
          />
        </View>

        {/* City, State, PIN */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>City / Town *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Vijayawada"
              placeholderTextColor="#94a3b8"
              value={city}
              onChangeText={setCity}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>PIN Code *</Text>
            <TextInput
              style={[styles.textInput, styles.monoInput]}
              placeholder="520001"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={6}
              value={pincode}
              onChangeText={(val) => setPincode(val.replace(/\D/g, ""))}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>State & Place of Supply</Text>
          <TextInput
            style={[styles.textInput, styles.readOnlyInput]}
            value={`${state} (Code 37)`}
            editable={false}
          />
        </View>

        {/* Preferred Transporter */}
        <View style={styles.inputGroup}>
          <View style={styles.labelWithHint}>
            <Text style={styles.inputLabel}>Preferred Transporter (Optional)</Text>
            <Text style={styles.hintText}>LR attached upon packing</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Navata, VRL Logistics, or Local Auto/Lorry"
            placeholderTextColor="#94a3b8"
            value={transporterName}
            onChangeText={setTransporterName}
          />
        </View>

        {/* Place Order CTA Button */}
        <TouchableOpacity
          style={[
            styles.checkoutBtn,
            (submitting || !isCustomerLoggedIn) && styles.checkoutBtnDisabled,
          ]}
          onPress={handleCheckout}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <MaterialCommunityIcons name="truck-delivery" size={20} color="#ffffff" />
              <Text style={styles.checkoutBtnText}>
                {isCustomerLoggedIn
                  ? `Place Wholesale Order (₹${grandTotal.toLocaleString("en-IN")})`
                  : "Login with Mobile OTP to Order"}
              </Text>
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
    paddingBottom: 40,
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
  itemBadgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  itemGstBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0369a1",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  itemHsnBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
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
    gap: 8,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
  },
  gstTag: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gstTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803d",
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
  taxSubVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0369a1",
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
    backgroundColor: "#e2e8f0",
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  totalSubtext: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  totalVal: {
    fontSize: 20,
    fontWeight: "900",
    color: "#b45309",
  },
  authBanner: {
    flexDirection: "row",
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  authBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
  },
  authBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#92400e",
    marginBottom: 2,
  },
  authBannerDesc: {
    fontSize: 12,
    color: "#78350f",
    lineHeight: 16,
    marginBottom: 8,
  },
  authBannerBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#b45309",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  authBannerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  verifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  verifiedTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  verifiedPhone: {
    fontSize: 11,
    color: "#15803d",
    marginTop: 1,
    fontWeight: "500",
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
  },
  formSubtitle: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 16,
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
  labelWithHint: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hintText: {
    fontSize: 11,
    color: "#94a3b8",
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
  monoInput: {
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  readOnlyInput: {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
  },
  phoneInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingLeft: 12,
  },
  phonePrefix: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
    marginRight: 6,
  },
  phoneInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingLeft: 0,
  },
  textArea: {
    height: 60,
    textAlignVertical: "top",
  },
  rowInputs: {
    flexDirection: "row",
    gap: 10,
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
    opacity: 0.65,
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
    marginBottom: 4,
  },
  successInvoiceNum: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0369a1",
    marginBottom: 10,
    fontFamily: "monospace",
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
