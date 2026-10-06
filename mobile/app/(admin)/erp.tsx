import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeaderBar } from "../../src/components/HeaderBar";
import { LoadingView } from "../../src/components/LoadingView";
import { ErrorView } from "../../src/components/ErrorView";
import { EmptyView } from "../../src/components/EmptyView";
import {
  fetchInvoices,
  fetchDeliveryChallans,
  fetchPayments,
  fetchLedger,
  fetchCompliance,
} from "../../src/api/erp";
import { Invoice, DeliveryChallan, LedgerAccount } from "../../src/types/models";
import { formatCurrency, formatDate } from "../../src/utils/formatters";

type ErpSubTab = "invoices" | "transport" | "payments" | "ledger" | "compliance";

export default function AdminErpScreen() {
  const [activeTab, setActiveTab] = useState<ErpSubTab>("invoices");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [ledgerData, setLedgerData] = useState<{
    ledgerAccounts: LedgerAccount[];
    trialBalance: { totalDebit: number; totalCredit: number; isBalanced: boolean };
  } | null>(null);
  const [complianceSummary, setComplianceSummary] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      if (activeTab === "invoices") {
        const invs = await fetchInvoices();
        setInvoices(invs);
      } else if (activeTab === "transport") {
        const dcs = await fetchDeliveryChallans();
        setChallans(dcs);
      } else if (activeTab === "payments") {
        const pays = await fetchPayments();
        setPayments(pays);
      } else if (activeTab === "ledger") {
        const led = await fetchLedger();
        setLedgerData(led);
      } else if (activeTab === "compliance") {
        const comp = await fetchCompliance("gstr3b");
        setComplianceSummary(comp);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load ERP module");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <HeaderBar title="Enterprise ERP" subtitle="GST Invoicing, Transport, Ledger & Compliance" />

      {/* ERP Sub-navigation horizontal bar */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          <TouchableOpacity
            style={[styles.tabChip, activeTab === "invoices" && styles.tabChipActive]}
            onPress={() => setActiveTab("invoices")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="file-document-outline"
              size={16}
              color={activeTab === "invoices" ? "#ffffff" : "#64748b"}
            />
            <Text style={[styles.tabText, activeTab === "invoices" && styles.tabTextActive]}>
              Tax Invoices
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === "transport" && styles.tabChipActive]}
            onPress={() => setActiveTab("transport")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="truck-delivery-outline"
              size={16}
              color={activeTab === "transport" ? "#ffffff" : "#64748b"}
            />
            <Text style={[styles.tabText, activeTab === "transport" && styles.tabTextActive]}>
              Transport & DC
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === "payments" && styles.tabChipActive]}
            onPress={() => setActiveTab("payments")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="cash-check"
              size={16}
              color={activeTab === "payments" ? "#ffffff" : "#64748b"}
            />
            <Text style={[styles.tabText, activeTab === "payments" && styles.tabTextActive]}>
              Payments
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === "ledger" && styles.tabChipActive]}
            onPress={() => setActiveTab("ledger")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="book-open-outline"
              size={16}
              color={activeTab === "ledger" ? "#ffffff" : "#64748b"}
            />
            <Text style={[styles.tabText, activeTab === "ledger" && styles.tabTextActive]}>
              General Ledger
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === "compliance" && styles.tabChipActive]}
            onPress={() => setActiveTab("compliance")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={16}
              color={activeTab === "compliance" ? "#ffffff" : "#64748b"}
            />
            <Text style={[styles.tabText, activeTab === "compliance" && styles.tabTextActive]}>
              Compliance
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Tab Contents */}
      {loading && !refreshing ? (
        <LoadingView message="Loading ERP module..." />
      ) : error ? (
        <ErrorView message={error} onRetry={loadData} />
      ) : activeTab === "invoices" ? (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.paymentStatus === "PAID"
                      ? styles.paidBadge
                      : item.paymentStatus === "PARTIAL"
                      ? styles.partialBadge
                      : styles.unpaidBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      item.paymentStatus === "PAID"
                        ? styles.paidText
                        : item.paymentStatus === "PARTIAL"
                        ? styles.partialText
                        : styles.unpaidText,
                    ]}
                  >
                    {item.paymentStatus}
                  </Text>
                </View>
              </View>

              <Text style={styles.customerLine}>
                Customer: {item.order?.customerName || item.order?.customer?.name || "Walk-in"}
              </Text>

              <View style={styles.invoiceNumbersRow}>
                <View>
                  <Text style={styles.metaLabel}>Taxable Value</Text>
                  <Text style={styles.metaValue}>{formatCurrency(item.totalTaxable)}</Text>
                </View>
                <View>
                  <Text style={styles.metaLabel}>Total GST</Text>
                  <Text style={styles.metaValue}>
                    {formatCurrency(item.totalCgst + item.totalSgst + item.totalIgst)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.metaLabel}>Grand Total</Text>
                  <Text style={styles.grandTotalText}>{formatCurrency(item.grandTotal)}</Text>
                </View>
              </View>

              <Text style={styles.dateLine}>{formatDate(item.invoiceDate)}</Text>
            </View>
          )}
          ListEmptyComponent={
            <EmptyView icon="receipt" title="No invoices yet" subtitle="GST tax invoices will appear here." />
          }
        />
      ) : activeTab === "transport" ? (
        <FlatList
          data={challans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.invoiceNumber}>{item.challanNumber}</Text>
                <View style={[styles.statusBadge, styles.inTransitBadge]}>
                  <Text style={[styles.statusBadgeText, styles.inTransitText]}>{item.status}</Text>
                </View>
              </View>

              <Text style={styles.boldDetail}>Transporter: {item.transporterName}</Text>
              <Text style={styles.detailLine}>LR Number: {item.lrNumber}</Text>
              <Text style={styles.detailLine}>Vehicle: {item.vehicleNumber}</Text>
              <Text style={styles.detailLine}>Destination: {item.destination}</Text>
              {item.eWayBillNo ? (
                <Text style={styles.ewayLine}>e-Way Bill: {item.eWayBillNo}</Text>
              ) : null}

              <Text style={styles.dateLine}>{formatDate(item.dispatchDate)}</Text>
            </View>
          )}
          ListEmptyComponent={
            <EmptyView
              icon="truck-delivery-outline"
              title="No delivery challans"
              subtitle="Dispatch and transport records will be listed here."
            />
          }
        />
      ) : activeTab === "payments" ? (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.invoiceNumber}>{item.paymentNumber}</Text>
                <View style={[styles.statusBadge, styles.paymentModeBadge]}>
                  <Text style={styles.paymentModeText}>{item.paymentMode}</Text>
                </View>
              </View>

              <Text style={styles.customerLine}>
                Customer: {item.customer?.name || "Direct Cash Counter"}
              </Text>
              <Text style={styles.paymentAmount}>{formatCurrency(item.amount)}</Text>
              {item.transactionRef ? (
                <Text style={styles.detailLine}>Ref: {item.transactionRef}</Text>
              ) : null}
              <Text style={styles.dateLine}>{formatDate(item.paymentDate)}</Text>
            </View>
          )}
          ListEmptyComponent={
            <EmptyView
              icon="cash-check"
              title="No payment records"
              subtitle="Payment receipts will be visible here."
            />
          }
        />
      ) : activeTab === "ledger" ? (
        <ScrollView
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />}
        >
          {ledgerData?.trialBalance && (
            <View style={styles.trialBalanceCard}>
              <Text style={styles.tbTitle}>Trial Balance Summary</Text>
              <View style={styles.tbRow}>
                <Text style={styles.tbLabel}>Total Debits:</Text>
                <Text style={styles.tbValue}>{formatCurrency(ledgerData.trialBalance.totalDebit)}</Text>
              </View>
              <View style={styles.tbRow}>
                <Text style={styles.tbLabel}>Total Credits:</Text>
                <Text style={styles.tbValue}>{formatCurrency(ledgerData.trialBalance.totalCredit)}</Text>
              </View>
              <View style={styles.tbStatusRow}>
                <MaterialCommunityIcons
                  name={ledgerData.trialBalance.isBalanced ? "check-circle" : "alert-circle"}
                  size={18}
                  color={ledgerData.trialBalance.isBalanced ? "#16a34a" : "#dc2626"}
                />
                <Text
                  style={[
                    styles.tbStatusText,
                    { color: ledgerData.trialBalance.isBalanced ? "#16a34a" : "#dc2626" },
                  ]}
                >
                  {ledgerData.trialBalance.isBalanced ? "Books Balanced" : "Balance Mismatch"}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.sectionHeading}>Chart of Accounts</Text>
          {ledgerData?.ledgerAccounts.map((acc) => (
            <View key={acc.id} style={styles.accountCard}>
              <View style={styles.accLeft}>
                <Text style={styles.accCode}>{acc.code}</Text>
                <Text style={styles.accName}>{acc.name}</Text>
                <Text style={styles.accGroup}>{acc.group}</Text>
              </View>
              <Text style={styles.accBalance}>{formatCurrency(acc.balance)}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>GSTR-3B Outward Taxable Return</Text>
            {complianceSummary?.payload?.outwardTaxableSupplies ? (
              <View style={{ marginTop: 10 }}>
                <View style={styles.tbRow}>
                  <Text style={styles.tbLabel}>GSTIN:</Text>
                  <Text style={styles.tbValue}>{complianceSummary.payload.gstin}</Text>
                </View>
                <View style={styles.tbRow}>
                  <Text style={styles.tbLabel}>Filing Period:</Text>
                  <Text style={styles.tbValue}>{complianceSummary.payload.month}</Text>
                </View>
                <View style={styles.tbRow}>
                  <Text style={styles.tbLabel}>Taxable Value:</Text>
                  <Text style={styles.tbValue}>
                    {formatCurrency(complianceSummary.payload.outwardTaxableSupplies.taxableValue)}
                  </Text>
                </View>
                <View style={styles.tbRow}>
                  <Text style={styles.tbLabel}>CGST Due:</Text>
                  <Text style={styles.tbValue}>
                    {formatCurrency(complianceSummary.payload.outwardTaxableSupplies.cgst)}
                  </Text>
                </View>
                <View style={styles.tbRow}>
                  <Text style={styles.tbLabel}>SGST Due:</Text>
                  <Text style={styles.tbValue}>
                    {formatCurrency(complianceSummary.payload.outwardTaxableSupplies.sgst)}
                  </Text>
                </View>
                <View style={styles.tbRow}>
                  <Text style={styles.tbLabel}>IGST Due:</Text>
                  <Text style={styles.tbValue}>
                    {formatCurrency(complianceSummary.payload.outwardTaxableSupplies.igst)}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.detailLine}>No compliance data generated yet.</Text>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  tabBar: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 44,
    gap: 6,
  },
  tabChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paidBadge: {
    backgroundColor: "#dcfce7",
  },
  partialBadge: {
    backgroundColor: "#fef3c7",
  },
  unpaidBadge: {
    backgroundColor: "#fee2e2",
  },
  inTransitBadge: {
    backgroundColor: "#e0f2fe",
  },
  paymentModeBadge: {
    backgroundColor: "#eff6ff",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  paidText: {
    color: "#166534",
  },
  partialText: {
    color: "#92400e",
  },
  unpaidText: {
    color: "#991b1b",
  },
  inTransitText: {
    color: "#0369a1",
  },
  paymentModeText: {
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "700",
  },
  customerLine: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
    marginBottom: 10,
  },
  invoiceNumbersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 11,
    color: "#94a3b8",
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginTop: 2,
  },
  grandTotalText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2563eb",
    marginTop: 2,
  },
  dateLine: {
    fontSize: 11,
    color: "#94a3b8",
  },
  boldDetail: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  detailLine: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 3,
  },
  ewayLine: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "600",
    marginBottom: 3,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#16a34a",
    marginVertical: 6,
  },
  trialBalanceCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tbTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  tbRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  tbLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  tbValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  tbStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  tbStatusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  accountCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  accLeft: {
    flex: 1,
  },
  accCode: {
    fontSize: 11,
    color: "#2563eb",
    fontWeight: "700",
  },
  accName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginTop: 2,
  },
  accGroup: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  accBalance: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
});
