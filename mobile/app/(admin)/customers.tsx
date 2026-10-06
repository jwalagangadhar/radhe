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
import { LoadingView } from "../../src/components/LoadingView";
import { ErrorView } from "../../src/components/ErrorView";
import { EmptyView } from "../../src/components/EmptyView";
import { fetchCustomers, createCustomer } from "../../src/api/customers";
import { Customer } from "../../src/types/models";
import { formatCurrency, formatDate } from "../../src/utils/formatters";

export default function AdminCustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Add customer modal
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [gstNumber, setGstNumber] = useState("");
  const [creditLimit, setCreditLimit] = useState("50000");

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchCustomers();
      setCustomers(res);
    } catch (err: any) {
      setError(err.message || "Failed to load customers");
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

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.gstNumber && c.gstNumber.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const handleAddCustomer = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Validation", "Customer name and phone number are required.");
      return;
    }

    setSaving(true);
    try {
      await createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        gstNumber: gstNumber.trim() || undefined,
        creditLimit: parseFloat(creditLimit) || 50000,
      });
      Alert.alert("Success", "Customer registered successfully");
      setModalVisible(false);
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setGstNumber("");
      loadData();
    } catch (err: any) {
      Alert.alert("Failed", err.message || "Could not register customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <HeaderBar
        title="Customer Directory"
        subtitle={`${customers.length} business accounts`}
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Add customer"
          >
            <MaterialCommunityIcons name="account-plus" size={18} color="#ffffff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.searchBarContainer}>
        <View style={styles.searchWrapper}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone, GSTIN..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <LoadingView message="Loading customers..." />
      ) : error && customers.length === 0 ? (
        <ErrorView message={error} onRetry={loadData} />
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPadding}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />}
          renderItem={({ item }) => (
            <View style={styles.customerCard}>
              <View style={styles.customerTop}>
                <View style={styles.customerAvatar}>
                  <Text style={styles.customerAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.customerDetails}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.customerPhone}>{item.phone}</Text>
                </View>
                <View style={styles.creditCol}>
                  <Text style={styles.creditLabel}>Credit Limit</Text>
                  <Text style={styles.creditVal}>{formatCurrency(item.creditLimit)}</Text>
                </View>
              </View>

              {item.gstNumber ? (
                <View style={styles.gstTag}>
                  <Text style={styles.gstText}>GST: {item.gstNumber}</Text>
                </View>
              ) : null}

              {item.address ? (
                <Text style={styles.addressLine}>
                  {item.address}, {item.city}
                </Text>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <EmptyView
              icon="account-group-outline"
              title="No customers found"
              subtitle="Add regular wholesale or retail customers for quick checkout."
              actionText="Add Customer"
              onAction={() => setModalVisible(true)}
            />
          }
        />
      )}

      {/* Add Customer Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Customer</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Customer Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Laxmi Traders"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile / WhatsApp Phone *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 9876543210"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>GST Number (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={gstNumber}
                  onChangeText={setGstNumber}
                  placeholder="27AAAAA0000A1Z5"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Delivery Address</Text>
                <TextInput
                  style={styles.modalInput}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Shop No, Market Road"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Credit Limit (₹)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={creditLimit}
                  onChangeText={setCreditLimit}
                  placeholder="50000"
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
                onPress={handleAddCustomer}
                disabled={saving}
                accessibilityRole="button"
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Register Customer</Text>
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
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minHeight: 44,
    gap: 4,
  },
  addBtnText: {
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
  listPadding: {
    padding: 16,
    paddingBottom: 32,
  },
  customerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  customerTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  customerAvatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2563eb",
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  customerPhone: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  creditCol: {
    alignItems: "flex-end",
  },
  creditLabel: {
    fontSize: 10,
    color: "#94a3b8",
  },
  creditVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16a34a",
  },
  gstTag: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
  },
  gstText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  addressLine: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalBox: {
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
  closeBtn: {
    padding: 4,
    minHeight: 44,
    justifyContent: "center",
  },
  modalBody: {
    padding: 20,
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
    backgroundColor: "#f8fafc",
    height: 48,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#0f172a",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
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
