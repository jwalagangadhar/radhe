import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeaderBar } from "../../src/components/HeaderBar";
import { OrderCard } from "../../src/components/OrderCard";
import { LoadingView } from "../../src/components/LoadingView";
import { ErrorView } from "../../src/components/ErrorView";
import { EmptyView } from "../../src/components/EmptyView";
import { fetchOrders, updateOrderStatus } from "../../src/api/orders";
import { Order, OrderStatus } from "../../src/types/models";

const WORKER_TABS: { label: string; filter?: OrderStatus }[] = [
  { label: "Active Queue" },
  { label: "Approved", filter: "APPROVED" },
  { label: "Packing", filter: "PACKING" },
  { label: "Pending", filter: "PENDING" },
];

export default function WorkerOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedFilter, setSelectedFilter] = useState<string>("Active Queue");
  const [search, setSearch] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      // Fetch queue orders or all available orders
      const res = await fetchOrders({ queue: true });
      setOrders(res);
    } catch (err: any) {
      setError(err.message || "Failed to load packing orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleStartPack = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, "PACKING");
      Alert.alert("Status Updated", "Order marked as PACKING. Proceed to assemble items.");
      loadOrders();
    } catch (err: any) {
      Alert.alert("Update Failed", err.message || "Could not update order status");
    }
  };

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    const tabConfig = WORKER_TABS.find((t) => t.label === selectedFilter);
    if (tabConfig?.filter) {
      result = result.filter((o) => o.status === tabConfig.filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.orderNumber.toString().includes(q) ||
          (o.customerName && o.customerName.toLowerCase().includes(q))
      );
    }

    return result;
  }, [orders, selectedFilter, search]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <HeaderBar title="Packing & Fulfillment Queue" subtitle="Verify items, pack bags & mark completed" />

      {/* Search Input */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchWrapper}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search order number or customer..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {WORKER_TABS.map((tab) => {
          const isSelected = selectedFilter === tab.label;
          return (
            <TouchableOpacity
              key={tab.label}
              style={[styles.tabChip, isSelected && styles.tabChipActive]}
              onPress={() => setSelectedFilter(tab.label)}
              accessibilityRole="button"
            >
              <Text style={[styles.tabChipText, isSelected && styles.tabChipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Orders List */}
      {loading && !refreshing ? (
        <LoadingView message="Loading fulfillment queue..." />
      ) : error && orders.length === 0 ? (
        <ErrorView message={error} onRetry={loadOrders} />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPadding}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#d97706"]} />}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              showWorkerAction={true}
              onWorkerPack={() => handleStartPack(item.id)}
              onPress={() => router.push(`/(worker)/order-details?id=${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyView
              icon="package-variant"
              title="No orders in queue"
              subtitle="All orders have been fulfilled or matched filter has no items."
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
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 36,
    justifyContent: "center",
  },
  tabChipActive: {
    backgroundColor: "#d97706",
    borderColor: "#d97706",
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  tabChipTextActive: {
    color: "#ffffff",
  },
  listPadding: {
    padding: 16,
    paddingBottom: 32,
  },
});
