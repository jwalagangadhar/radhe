import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeaderBar } from "../../src/components/HeaderBar";
import { OrderCard } from "../../src/components/OrderCard";
import { LoadingView } from "../../src/components/LoadingView";
import { ErrorView } from "../../src/components/ErrorView";
import { EmptyView } from "../../src/components/EmptyView";
import { fetchOrders } from "../../src/api/orders";
import { Order, OrderStatus } from "../../src/types/models";

const STATUS_FILTERS: { label: string; value: OrderStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Packing", value: "PACKING" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function AdminOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "ALL">("ALL");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest">("newest");

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      const params = selectedStatus !== "ALL" ? { status: selectedStatus } : {};
      const res = await fetchOrders(params);
      setOrders(res);
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  // Filter and sort orders client-side for search responsiveness
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.orderNumber.toString().includes(q) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.customerPhone && o.customerPhone.includes(q)) ||
          (o.customer?.name && o.customer.name.toLowerCase().includes(q))
      );
    }

    if (sortOrder === "newest") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortOrder === "oldest") {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortOrder === "highest") {
      result.sort((a, b) => b.total - a.total);
    }

    return result;
  }, [orders, search, sortOrder]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <HeaderBar title="Orders Management" subtitle="Manage wholesale & retail orders" />

      <View style={styles.searchBarContainer}>
        <View style={styles.searchWrapper}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order #, customer, phone..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")} style={styles.clearBtn}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Sort Button */}
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => {
            if (sortOrder === "newest") setSortOrder("highest");
            else if (sortOrder === "highest") setSortOrder("oldest");
            else setSortOrder("newest");
          }}
          accessibilityRole="button"
          accessibilityLabel={`Sort orders: currently ${sortOrder}`}
        >
          <MaterialCommunityIcons name="sort" size={20} color="#2563eb" />
          <Text style={styles.sortBtnText}>
            {sortOrder === "newest" ? "Recent" : sortOrder === "highest" ? "High Total" : "Oldest"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status Filter Horizontal List */}
      <View style={styles.filtersWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => {
            const isSelected = selectedStatus === item.value;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedStatus(item.value)}
                accessibilityRole="button"
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Main Order List */}
      {loading && !refreshing ? (
        <LoadingView message="Loading orders..." />
      ) : error && orders.length === 0 ? (
        <ErrorView message={error} onRetry={loadOrders} />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.ordersList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => router.push(`/(admin)/order-details?id=${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyView
              icon="clipboard-text-outline"
              title="No orders found"
              subtitle={
                search
                  ? `No orders matching "${search}"`
                  : "No orders match the selected filter."
              }
              actionText={search ? "Clear Search" : undefined}
              onAction={() => setSearch("")}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  searchBarContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
    alignItems: "center",
  },
  searchWrapper: {
    flex: 1,
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
  clearBtn: {
    padding: 4,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 4,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563eb",
  },
  filtersWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  filtersList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 36,
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  ordersList: {
    padding: 16,
    paddingBottom: 32,
  },
});
