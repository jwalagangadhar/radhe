import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeaderBar } from "../../src/components/HeaderBar";
import { LoadingView } from "../../src/components/LoadingView";
import { ErrorView } from "../../src/components/ErrorView";
import { EmptyView } from "../../src/components/EmptyView";
import { fetchProducts } from "../../src/api/products";
import { fetchStockAdjustments, createStockAdjustment } from "../../src/api/stock";
import { Product, StockAdjustment } from "../../src/types/models";
import { formatCurrency, formatDate } from "../../src/utils/formatters";

export default function AdminStockScreen() {
  const [activeTab, setActiveTab] = useState<"low" | "all" | "adjustments">("low");
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  // Adjustment modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjQuantity, setAdjQuantity] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [savingAdj, setSavingAdj] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [prods, adjs] = await Promise.all([
        fetchProducts(),
        fetchStockAdjustments(),
      ]);
      setProducts(prods);
      setAdjustments(adjs);
    } catch (err: any) {
      setError(err.message || "Failed to load stock data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock <= p.minStock);
  }, [products]);

  const filteredItems = useMemo(() => {
    const list = activeTab === "low" ? lowStockProducts : products;
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [activeTab, lowStockProducts, products, search]);

  const openAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setAdjQuantity("");
    setAdjReason("Manual Audit / Rebalance");
    setModalVisible(true);
  };

  const submitAdjustment = async () => {
    if (!selectedProduct) return;
    const qty = parseFloat(adjQuantity);
    if (isNaN(qty) || qty === 0) {
      Alert.alert("Validation", "Enter a non-zero adjustment (+ to add, - for scrap/loss)");
      return;
    }
    if (!adjReason.trim()) {
      Alert.alert("Validation", "Reason is required");
      return;
    }

    setSavingAdj(true);
    try {
      await createStockAdjustment({
        productId: selectedProduct.id,
        quantity: qty,
        reason: adjReason.trim(),
      });
      Alert.alert("Success", "Stock adjustment recorded successfully");
      setModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert("Adjustment Failed", err.message || "Could not record stock adjustment");
    } finally {
      setSavingAdj(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <HeaderBar
        title="Stock & Inventory"
        subtitle={`${lowStockProducts.length} low stock warnings`}
      />

      {/* Tabs Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "low" && styles.tabButtonActive]}
          onPress={() => setActiveTab("low")}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={16}
            color={activeTab === "low" ? "#dc2626" : "#64748b"}
          />
          <Text style={[styles.tabText, activeTab === "low" && styles.tabTextActiveAlert]}>
            Low Stock ({lowStockProducts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "all" && styles.tabButtonActive]}
          onPress={() => setActiveTab("all")}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="warehouse"
            size={16}
            color={activeTab === "all" ? "#2563eb" : "#64748b"}
          />
          <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>
            All Inventory ({products.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "adjustments" && styles.tabButtonActive]}
          onPress={() => setActiveTab("adjustments")}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="history"
            size={16}
            color={activeTab === "adjustments" ? "#2563eb" : "#64748b"}
          />
          <Text style={[styles.tabText, activeTab === "adjustments" && styles.tabTextActive]}>
            Audit Log
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input for Products */}
      {activeTab !== "adjustments" && (
        <View style={styles.searchBarContainer}>
          <View style={styles.searchWrapper}>
            <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search product stock..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
            />
          </View>
        </View>
      )}

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <LoadingView message="Loading inventory data..." />
      ) : error && products.length === 0 ? (
        <ErrorView message={error} onRetry={loadData} />
      ) : activeTab === "adjustments" ? (
        <FlatList
          data={adjustments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPadding}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />}
          renderItem={({ item }) => (
            <View style={styles.logCard}>
              <View style={styles.logTop}>
                <Text style={styles.logProduct}>{item.product?.name || "Inventory Item"}</Text>
                <Text
                  style={[
                    styles.logQty,
                    item.quantity >= 0 ? styles.positiveQty : styles.negativeQty,
                  ]}
                >
                  {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
                </Text>
              </View>
              <Text style={styles.logReason}>Reason: {item.reason}</Text>
              <Text style={styles.logDate}>{formatDate(item.createdAt)}</Text>
            </View>
          )}
          ListEmptyComponent={
            <EmptyView
              icon="history"
              title="No adjustments recorded"
              subtitle="Manual scrap and stock audit entries will appear here."
            />
          }
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPadding}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />}
          renderItem={({ item }) => {
            const isCritical = item.stock <= 0;
            const isLow = item.stock <= item.minStock;

            return (
              <View style={styles.stockCard}>
                <View style={styles.stockMain}>
                  <View style={styles.stockInfo}>
                    <Text style={styles.stockName}>{item.name}</Text>
                    <Text style={styles.stockCategory}>{item.category}</Text>
                    <View style={styles.thresholdRow}>
                      <Text style={styles.thresholdText}>Min Required: {item.minStock} {item.unit}</Text>
                      <Text style={styles.thresholdText}>Rate: {formatCurrency(item.price)}</Text>
                    </View>
                  </View>

                  <View style={styles.stockCountCol}>
                    <Text
                      style={[
                        styles.stockBigNumber,
                        isCritical ? styles.textRed : isLow ? styles.textAmber : styles.textGreen,
                      ]}
                    >
                      {item.stock}
                    </Text>
                    <Text style={styles.stockUnitLabel}>{item.unit}</Text>
                  </View>
                </View>

                <View style={styles.stockActions}>
                  <TouchableOpacity
                    style={styles.adjustBtn}
                    onPress={() => openAdjustModal(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Adjust stock for ${item.name}`}
                  >
                    <MaterialCommunityIcons name="swap-vertical" size={16} color="#2563eb" />
                    <Text style={styles.adjustBtnText}>Adjust Stock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyView
              icon="check-circle-outline"
              title={activeTab === "low" ? "Stock Levels Healthy" : "No products found"}
              subtitle={
                activeTab === "low"
                  ? "All products are currently above their minimum safety thresholds."
                  : "No products matched the search query."
              }
            />
          }
        />
      )}

      {/* Stock Adjustment Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Adjust Stock Quantity</Text>
            <Text style={styles.modalProduct}>{selectedProduct?.name}</Text>
            <Text style={styles.modalCurrent}>
              Current: {selectedProduct?.stock} {selectedProduct?.unit}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Adjustment Quantity (+ add, - deduct)</Text>
              <TextInput
                style={styles.modalInput}
                value={adjQuantity}
                onChangeText={setAdjQuantity}
                placeholder="e.g. +50 or -5"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Audit / Scrap Reason *</Text>
              <TextInput
                style={styles.modalInput}
                value={adjReason}
                onChangeText={setAdjReason}
                placeholder="e.g. Inflow arrival, damaged bag, scrap"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={submitAdjustment}
                disabled={savingAdj}
                accessibilityRole="button"
              >
                {savingAdj ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Apply Change</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 44,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#2563eb",
  },
  tabTextActiveAlert: {
    color: "#dc2626",
    fontWeight: "700",
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    height: 44,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    height: "100%",
  },
  listPadding: {
    padding: 16,
    paddingBottom: 32,
  },
  stockCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  stockMain: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stockInfo: {
    flex: 1,
    marginRight: 16,
  },
  stockName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  stockCategory: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  thresholdRow: {
    marginTop: 8,
    gap: 2,
  },
  thresholdText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  stockCountCol: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  stockBigNumber: {
    fontSize: 26,
    fontWeight: "900",
  },
  stockUnitLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  textRed: {
    color: "#ef4444",
  },
  textAmber: {
    color: "#d97706",
  },
  textGreen: {
    color: "#16a34a",
  },
  stockActions: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    alignItems: "flex-end",
  },
  adjustBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 44,
    gap: 4,
  },
  adjustBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563eb",
  },
  logCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  logTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logProduct: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  logQty: {
    fontSize: 16,
    fontWeight: "800",
  },
  positiveQty: {
    color: "#16a34a",
  },
  negativeQty: {
    color: "#dc2626",
  },
  logReason: {
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
  },
  logDate: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalProduct: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563eb",
    marginTop: 4,
  },
  modalCurrent: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    minHeight: 44,
    justifyContent: "center",
  },
  cancelBtnText: {
    color: "#64748b",
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
