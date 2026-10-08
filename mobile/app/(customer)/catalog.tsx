import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { fetchProducts } from "../../src/api/products";
import { Product } from "../../src/types/models";
import { useCart } from "../../src/context/CartContext";

const CATEGORIES = [
  "All",
  "Atta & Flours",
  "Dals & Pulses",
  "Rice & Grains",
  "Sugar & Jaggery",
  "Edible Oils",
  "Spices",
];

export default function CustomerCatalogScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const { items, addToCart, updateQuantity } = useCart();

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchProducts({
        category: category !== "All" ? category : undefined,
        search: search.trim() || undefined,
        active: true,
        orderType: "WEB",
      });
      setProducts(data);
    } catch (err) {
      console.error("Failed to load catalog:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCatalog();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadCatalog]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCatalog();
  };

  const getCartQuantity = (productId: string) => {
    const item = items.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const bagWeight = item.bagWeight && item.bagWeight > 0 ? item.bagWeight : 30;
    const effectivePerKg = item.webPrice ?? item.price;
    const bagPrice = Math.round(effectivePerKg * bagWeight);
    const inCartQty = getCartQuantity(item.id);
    const inStock = item.stock > 0;

    return (
      <View style={styles.productCard}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
            <View style={styles.gstBadge}>
              <Text style={styles.gstText}>GST {item.gstRate || 5}%</Text>
            </View>
          </View>
          <View
            style={[
              styles.stockBadge,
              inStock ? styles.inStockBadge : styles.outOfStockBadge,
            ]}
          >
            <View
              style={[
                styles.stockDot,
                inStock ? styles.inStockDot : styles.outOfStockDot,
              ]}
            />
            <Text
              style={[
                styles.stockText,
                inStock ? styles.inStockText : styles.outOfStockText,
              ]}
            >
              {inStock ? `${item.stock} bags ready` : "Out of stock"}
            </Text>
          </View>
        </View>

        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.specRow}>
          <View style={styles.specBadge}>
            <MaterialCommunityIcons name="weight" size={14} color="#78350f" />
            <Text style={styles.specText}>{bagWeight}kg Bag</Text>
          </View>
          <View style={styles.hsnBadge}>
            <Text style={styles.hsnText}>HSN: {item.hsnCode || "1006"}</Text>
          </View>
          <Text style={styles.perKgText}>₹{effectivePerKg}/kg</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.priceLabel}>Wholesale Price</Text>
            <Text style={styles.bagPrice}>₹{bagPrice.toLocaleString("en-IN")}</Text>
          </View>

          {inStock ? (
            inCartQty > 0 ? (
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => updateQuantity(item.id, inCartQty - 1)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="minus" size={16} color="#b45309" />
                </TouchableOpacity>
                <Text style={styles.stepperQty}>{inCartQty}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => updateQuantity(item.id, inCartQty + 1)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="plus" size={16} color="#b45309" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => addToCart(item, 1)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="cart-plus" size={16} color="#ffffff" />
                <Text style={styles.addBtnText}>Add Bag</Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.disabledBtn}>
              <Text style={styles.disabledBtnText}>Unavailable</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search dals, rice, atta, grains..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Categories Bar */}
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          keyExtractor={(cat) => cat}
          renderItem={({ item: cat }) => {
            const isSelected = category === cat;
            return (
              <TouchableOpacity
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Banner Notice */}
      <View style={styles.bannerNotice}>
        <MaterialCommunityIcons name="shield-check" size={18} color="#d97706" />
        <Text style={styles.bannerText}>
          Sortex-clean wholesale grains packed in sealed 25kg–50kg bags.
        </Text>
      </View>

      {/* Products List */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#b45309" />
          <Text style={styles.loadingText}>Loading wholesale catalog...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="grain" size={54} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No wholesale items found</Text>
          <Text style={styles.emptySubtitle}>
            Try changing your search terms or selecting another category.
          </Text>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              setSearch("");
              setCategory("All");
            }}
          >
            <Text style={styles.resetBtnText}>Reset Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#b45309"]} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  searchSection: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
  },
  categoryList: {
    paddingVertical: 10,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  categoryChipActive: {
    backgroundColor: "#78350f",
    borderColor: "#78350f",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  categoryChipTextActive: {
    color: "#ffffff",
  },
  bannerNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  bannerText: {
    fontSize: 11,
    color: "#92400e",
    fontWeight: "600",
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  productCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  gstBadge: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gstText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#047857",
  },
  hsnBadge: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hsnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  inStockBadge: {
    backgroundColor: "#ecfdf5",
  },
  outOfStockBadge: {
    backgroundColor: "#fef2f2",
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  inStockDot: {
    backgroundColor: "#10b981",
  },
  outOfStockDot: {
    backgroundColor: "#ef4444",
  },
  stockText: {
    fontSize: 10,
    fontWeight: "600",
  },
  inStockText: {
    color: "#047857",
  },
  outOfStockText: {
    color: "#b91c1c",
  },
  productName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  specRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  specBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  specText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#78350f",
  },
  perKgText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  bagPrice: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#b45309",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  addBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  disabledBtn: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  disabledBtnText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fde68a",
    overflow: "hidden",
  },
  stepperBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fef3c7",
  },
  stepperQty: {
    fontSize: 14,
    fontWeight: "800",
    color: "#78350f",
    paddingHorizontal: 6,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
  },
  resetBtn: {
    backgroundColor: "#78350f",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resetBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
