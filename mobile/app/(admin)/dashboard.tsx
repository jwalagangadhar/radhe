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
import { fetchDashboardData } from "../../src/api/erp";
import { DashboardData } from "../../src/types/models";
import { formatCurrency } from "../../src/utils/formatters";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchDashboardData();
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <HeaderBar title="Admin Overview" />
        <LoadingView message="Loading operational dashboard..." />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <HeaderBar title="Admin Overview" />
        <ErrorView message={error} onRetry={loadDashboard} />
      </SafeAreaView>
    );
  }

  const stats = data?.stats;
  const stock = data?.stockSummary;
  const daily = data?.sales?.daily || [];
  const maxSale = Math.max(...daily.map((d) => d.total), 1);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <HeaderBar title="Admin Dashboard" subtitle="Radhe Wholesale & Retail Traders" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />}
      >
        {/* Quick Management Shortcuts */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll}>
          <TouchableOpacity
            style={styles.quickActionChip}
            onPress={() => router.push("/(admin)/orders")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="clipboard-check-outline" size={16} color="#2563eb" />
            <Text style={styles.quickActionText}>All Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionChip}
            onPress={() => router.push("/(admin)/products")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="plus-box-outline" size={16} color="#059669" />
            <Text style={styles.quickActionText}>Products</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionChip}
            onPress={() => router.push("/(admin)/stock")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="alert-octagon-outline" size={16} color="#d97706" />
            <Text style={styles.quickActionText}>Stock Alerts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionChip}
            onPress={() => router.push("/(admin)/erp")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="finance" size={16} color="#7c3aed" />
            <Text style={styles.quickActionText}>ERP & Ledger</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionChip}
            onPress={() => router.push("/(admin)/customers")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="account-group-outline" size={16} color="#0284c7" />
            <Text style={styles.quickActionText}>Customers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionChip}
            onPress={() => router.push("/(admin)/settings")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="cog-outline" size={16} color="#475569" />
            <Text style={styles.quickActionText}>Staff & Settings</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Sales & Orders Overview Cards */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Business Snapshot</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Today's Sales"
            value={formatCurrency(stats?.todaySales || 0)}
            subtitle={`${stats?.todayOrderCount || 0} completed orders`}
            icon="cash-multiple"
            color="#16a34a"
            bgColor="#dcfce7"
          />
          <StatCard
            title="Today's Profit"
            value={formatCurrency(stats?.todayProfit || 0)}
            subtitle="Gross Margin"
            icon="trending-up"
            color="#2563eb"
            bgColor="#eff6ff"
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Pending Web"
            value={stats?.pendingWebOrders || 0}
            subtitle="Awaiting Approval"
            icon="clock-alert-outline"
            color="#d97706"
            bgColor="#fef3c7"
          />
          <StatCard
            title="Low Stock Items"
            value={stock?.lowStockCount || 0}
            subtitle="Immediate Reorder"
            icon="alert-circle-outline"
            color="#dc2626"
            bgColor="#fee2e2"
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Month Sales"
            value={formatCurrency(stats?.currentMonthSales || 0)}
            subtitle="Gross Volume"
            icon="calendar-month-outline"
            color="#7c3aed"
            bgColor="#f3e8ff"
          />
          <StatCard
            title="Total Inventory"
            value={formatCurrency(stock?.totalStockValue || 0)}
            subtitle={`${stock?.totalProducts || 0} active products`}
            icon="warehouse"
            color="#0891b2"
            bgColor="#cffafe"
          />
        </View>

        {/* Weekly Revenue Trend Chart */}
        {daily.length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>7-Day Sales Trend</Text>
                <Text style={styles.chartSubtitle}>Daily completed order sales</Text>
              </View>
              <Text style={styles.chartTotal}>
                {formatCurrency(daily.reduce((sum, d) => sum + d.total, 0))}
              </Text>
            </View>

            <View style={styles.barChartContainer}>
              {daily.map((item, index) => {
                const heightPercent = Math.max(12, Math.round((item.total / maxSale) * 100));
                return (
                  <View key={index} style={styles.barCol}>
                    <Text style={styles.barValueText}>
                      {item.total > 0 ? `₹${Math.round(item.total / 1000)}k` : "0"}
                    </Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: `${heightPercent}%` }]} />
                    </View>
                    <Text style={styles.barLabel}>{item.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent Orders List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity onPress={() => router.push("/(admin)/orders")}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {data?.recentOrders && data.recentOrders.length > 0 ? (
          data.recentOrders.slice(0, 5).map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => router.push(`/(admin)/order-details?id=${order.id}`)}
            />
          ))
        ) : (
          <View style={styles.emptyRecent}>
            <Text style={styles.emptyRecentText}>No recent orders recorded</Text>
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
  quickActionsScroll: {
    marginBottom: 16,
    flexDirection: "row",
  },
  quickActionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 8,
    minHeight: 44,
    gap: 6,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
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
    color: "#2563eb",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  chartCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 8,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  chartSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  chartTotal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2563eb",
  },
  barChartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 140,
    paddingTop: 10,
  },
  barCol: {
    alignItems: "center",
    flex: 1,
  },
  barValueText: {
    fontSize: 10,
    color: "#94a3b8",
    marginBottom: 4,
    fontWeight: "500",
  },
  barTrack: {
    width: 14,
    height: 90,
    backgroundColor: "#f1f5f9",
    borderRadius: 7,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    backgroundColor: "#2563eb",
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 6,
  },
  emptyRecent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyRecentText: {
    color: "#94a3b8",
    fontSize: 14,
  },
});
