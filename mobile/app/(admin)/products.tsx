import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeaderBar } from "../../src/components/HeaderBar";
import { ProductCard } from "../../src/components/ProductCard";
import { LoadingView } from "../../src/components/LoadingView";
import { ErrorView } from "../../src/components/ErrorView";
import { EmptyView } from "../../src/components/EmptyView";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../src/api/products";
import { Product } from "../../src/types/models";

export default function AdminProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Add / Edit Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Groceries");
  const [formPrice, setFormPrice] = useState("");
  const [formCostPrice, setFormCostPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formUnit, setFormUnit] = useState("kg");
  const [formMinStock, setFormMinStock] = useState("5");

  const loadProducts = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchProducts();
      setProducts(res);
    } catch (err: any) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["All", ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory !== "All") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q))
      );
    }

    return result;
  }, [products, selectedCategory, search]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName("");
    setFormCategory("Groceries");
    setFormPrice("");
    setFormCostPrice("");
    setFormStock("");
    setFormUnit("kg");
    setFormMinStock("5");
    setModalVisible(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice(product.price.toString());
    setFormCostPrice(product.costPrice?.toString() || "");
    setFormStock(product.stock.toString());
    setFormUnit(product.unit || "kg");
    setFormMinStock(product.minStock.toString());
    setModalVisible(true);
  };

  const handleSaveProduct = async () => {
    if (!formName.trim()) {
      Alert.alert("Validation", "Product name is required");
      return;
    }
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert("Validation", "Please enter a valid selling price");
      return;
    }
    const stockNum = parseFloat(formStock);
    if (isNaN(stockNum) || stockNum < 0) {
      Alert.alert("Validation", "Please enter a valid stock quantity");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Product> = {
        name: formName.trim(),
        category: formCategory.trim() || "Groceries",
        price: priceNum,
        costPrice: formCostPrice ? parseFloat(formCostPrice) : 0,
        stock: stockNum,
        unit: formUnit.trim() || "kg",
        minStock: formMinStock ? parseFloat(formMinStock) : 5,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        Alert.alert("Success", "Product updated successfully");
      } else {
        await createProduct(payload);
        Alert.alert("Success", "Product created successfully");
      }

      setModalVisible(false);
      loadProducts();
    } catch (err: any) {
      Alert.alert("Save Failed", err.message || "Could not save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${product.name}"? If there are active orders referencing this product, the server will safely reject deletion.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProduct(product.id);
              Alert.alert("Deleted", "Product was successfully removed");
              loadProducts();
            } catch (err: any) {
              Alert.alert("Delete Failed", err.message || "Cannot delete product referenced in active orders");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <HeaderBar
        title="Products Inventory"
        subtitle={`${products.length} products registered`}
        rightAction={
          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={openAddModal}
            accessibilityRole="button"
            accessibilityLabel="Add new product"
          >
            <MaterialCommunityIcons name="plus" size={20} color="#ffffff" />
            <Text style={styles.addHeaderBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

      {/* Search Input */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchWrapper}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search product name, category..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.categoriesWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item;
            return (
              <TouchableOpacity
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(item)}
                accessibilityRole="button"
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Product List */}
      {loading && !refreshing ? (
        <LoadingView message="Loading product catalog..." />
      ) : error && products.length === 0 ? (
        <ErrorView message={error} onRetry={loadProducts} />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.productList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              isAdmin={true}
              onEdit={() => openEditModal(item)}
              onDelete={() => handleDeleteProduct(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyView
              icon="package-variant-closed"
              title="No products found"
              subtitle={
                search
                  ? `No products match "${search}"`
                  : "No products in this category yet."
              }
              actionText="Add Product"
              onAction={openAddModal}
            />
          }
        />
      )}

      {/* Add / Edit Product Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Product Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="e.g. Kolam Rice Supreme 25kg"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={formCategory}
                  onChangeText={setFormCategory}
                  placeholder="e.g. Grains, Sweeteners, Spices"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Selling Price (₹) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={formPrice}
                    onChangeText={setFormPrice}
                    placeholder="0.00"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Wholesale Cost (₹)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={formCostPrice}
                    onChangeText={setFormCostPrice}
                    placeholder="0.00"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Stock Quantity *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={formStock}
                    onChangeText={setFormStock}
                    placeholder="100"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Unit (kg, packet, bag)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={formUnit}
                    onChangeText={setFormUnit}
                    placeholder="kg"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Low Stock Alert Threshold</Text>
                <TextInput
                  style={styles.modalInput}
                  value={formMinStock}
                  onChangeText={setFormMinStock}
                  placeholder="5"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProduct}
                disabled={saving}
                accessibilityRole="button"
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Product</Text>
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
  addHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minHeight: 44,
    gap: 4,
  },
  addHeaderBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    height: 46,
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
  categoriesWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 36,
    justifyContent: "center",
  },
  categoryChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  categoryChipTextActive: {
    color: "#ffffff",
  },
  productList: {
    padding: 16,
    paddingBottom: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalCloseBtn: {
    padding: 4,
    minHeight: 44,
    justifyContent: "center",
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    height: 48,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#0f172a",
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    minHeight: 48,
    justifyContent: "center",
  },
  cancelBtnText: {
    color: "#475569",
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 48,
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
