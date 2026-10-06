import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeaderBar } from "../../src/components/HeaderBar";
import { StatCard } from "../../src/components/StatCard";
import { OrderCard } from "../../src/components/OrderCard";
import { LoadingView } from "../../src/components/LoadingView";
import { ErrorView } from "../../src/components/ErrorView";
import { fetchOrders, updateOrderStatus } from "../../src/api/orders";
import { Order } from "../../src/types/models";
import { useAuth } from "../../src/hooks/useAuth";

export default function WorkerDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [queueOrders, setQueueOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkerData = useCallback(async () => {
    try {
      setError(null);
      // Fetch queue orders (PENDING, APPROVED, PACKING)
      const res = await fetchOrders({ queue: true });
      setQueueOrders(res);
    } catch (err: any) {
      setError(err.message || "Failed to load packing queue");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWorkerData();
  }, [loadWorkerData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkerData();
  };

  const handleStartPack = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, "PACKING");
      loadWorkerData();
    } catch (err: any) {
      // Refresh to get fresh state
      loadWorkerData();
    }
  };

  const packingCount = queueOrders.filter((o) => o.status === "PACKING").length;
  const readyToPackCount = queueOrders.filter((o) => o.status === "APPROVED").length;
  const pendingCount = queueOrders.filter((o) => o.status === "PENDING").length;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <HeaderBar title="Worker Portal" />
        <LoadingView message="Loading warehouse packing queue..." />
      </SafeAreaView>
    );
  }

  if (error && queueOrders.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <HeaderBar title="Worker Portal" />
        <ErrorView message={error} onRetry={loadWorkerData} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <HeaderBar
        title="Fulfillment Station"
        subtitle={`Logged in as ${user?.name || "Store Worker"}`}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#d97706"]} />}
      >
        {/* Worker Shift Banner */}
        <View style={styles.shiftBanner}>
          <View style={styles.shiftIconBox}>
            <MaterialCommunityIcons name="dolly" size={28} color="#d97706" />
          </View>
          <View style={styles.shiftTextBox}>
            <Text style={styles.shiftTitle}>Fulfillment & Packing Shift</Text>
            <Text style={styles.shiftSubtitle}>
              Prepare order bags, verify weights, and update fulfillment status.
            </Text>
          </View>
        </View>

        {/* Packing KPIs */}
        <View style={styles.statsGrid}>
          <StatCard
            title="In Packing"
            value={packingCount}
            subtitle="Currently being packed"
            icon="package-variant"
            color="#d97706"
            bgColor="#fef3c7"
          />
          <StatCard
            title="Ready to Pack"
            value={readyToPackCount}
            subtitle="Approved orders"
            icon="check-circle-outline"
            color="#2563eb"
            bgColor="#eff6ff"
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Pending Review"
            value={pendingCount}
            subtitle="Awaiting admin approval"
            icon="clock-outline"
            color="#64748b"
            bgColor="#f1f5f9"
          />
          <StatCard
            title="Total Queue"
            value={queueOrders.length}
            subtitle="Fulfillment items"
            icon="clipboard-list-outline"
            color="#059669"
            bgColor="#dcfce7"
          />
        </View>

        {/* Priority Packing Tasks */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Priority Fulfillment Orders</Text>
          <TouchableOpacity onPress={() => router.push("/(worker)/orders")}>
            <Text style={styles.seeAllText}>View All ({queueOrders.length})</Text>
          </TouchableOpacity>
        </View>

        {queueOrders.length > 0 ? (
          queueOrders.slice(0, 5).map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              showWorkerAction={true}
              onWorkerPack={() => handleStartPack(order.id)}
              onPress={() => router.push(`/(worker)/order-details?id=${order.id}`)}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={48} color="#16a34a" />
            <Text style={styles.emptyTitle}>Packing Queue Clear</Text>
            <Text style={styles.emptySubtitle}>All customer orders are currently packed and dispatched.</Text>
          </View>
        )}
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
    paddingBottom: 32,
  },
  shiftBanner: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  shiftIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#fffbeb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  shiftTextBox: {
    flex: 1,
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  shiftSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    lineHeight: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#d97706",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },
});
