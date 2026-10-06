import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeaderBar } from "../../src/components/HeaderBar";
import { LoadingView } from "../../src/components/LoadingView";
import { ErrorView } from "../../src/components/ErrorView";
import { fetchWorkers, createWorker, updateWorker } from "../../src/api/erp";
import { WorkerUser } from "../../src/types/models";
import { API_BASE_URL } from "../../src/api/client";
import { formatDate } from "../../src/utils/formatters";

export default function AdminSettingsScreen() {
  const [workers, setWorkers] = useState<WorkerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Worker Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"WORKER" | "ADMIN">("WORKER");

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const users = await fetchWorkers();
      setWorkers(users);
    } catch (err: any) {
      setError(err.message || "Failed to load staff list");
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

  const handleAddWorker = async () => {
    if (!username.trim() || username.length < 3) {
      Alert.alert("Validation", "Username must be at least 3 characters.");
      return;
    }
    if (!password || password.length < 4) {
      Alert.alert("Validation", "Password must be at least 4 characters.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Validation", "Staff name is required.");
      return;
    }

    setSaving(true);
    try {
      await createWorker({
        username: username.trim().toLowerCase(),
        password,
        name: name.trim(),
        role,
        phone: phone.trim() || undefined,
      });
      Alert.alert("Success", "Account created successfully");
      setModalVisible(false);
      setUsername("");
      setPassword("");
      setName("");
      setPhone("");
      loadData();
    } catch (err: any) {
      Alert.alert("Creation Failed", err.message || "Could not create user account");
    } finally {
      setSaving(false);
    }
  };

  const toggleUserActive = async (worker: WorkerUser) => {
    const nextState = !worker.active;
    Alert.alert(
      "Confirm Status Change",
      `Are you sure you want to ${nextState ? "activate" : "deactivate"} access for ${worker.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: nextState ? "Activate" : "Deactivate",
          style: nextState ? "default" : "destructive",
          onPress: async () => {
            try {
              await updateWorker({
                id: worker.id,
                active: nextState,
              });
              loadData();
            } catch (err: any) {
              Alert.alert("Update Failed", err.message || "Could not update user");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <HeaderBar
        title="Settings & Staff"
        subtitle="Manage users, security, and company parameters"
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />}
      >
        {/* Company Identity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trading Enterprise Details</Text>
          <View style={styles.rowItem}>
            <Text style={styles.rowLabel}>Company Name</Text>
            <Text style={styles.rowValue}>Radhe Wholesale & Retail Traders</Text>
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.rowLabel}>GSTIN</Text>
            <Text style={styles.rowValueHighlight}>27AAAAA0000A1Z5</Text>
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.rowLabel}>State / Jurisdiction</Text>
            <Text style={styles.rowValue}>27 - Maharashtra</Text>
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.rowLabel}>Primary Bank</Text>
            <Text style={styles.rowValue}>State Bank of India</Text>
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.rowLabel}>UPI Gateway</Text>
            <Text style={styles.rowValue}>radhetraders@sbi</Text>
          </View>
        </View>

        {/* Staff Management */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Staff & Role Accounts</Text>
              <Text style={styles.cardSubtitle}>Total {workers.length} active portal users</Text>
            </View>
            <TouchableOpacity
              style={styles.addStaffBtn}
              onPress={() => setModalVisible(true)}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="account-plus-outline" size={16} color="#ffffff" />
              <Text style={styles.addStaffText}>Add User</Text>
            </TouchableOpacity>
          </View>

          {loading && !refreshing ? (
            <ActivityIndicator color="#2563eb" style={{ marginVertical: 16 }} />
          ) : error && workers.length === 0 ? (
            <Text style={styles.errorNote}>{error}</Text>
          ) : (
            workers.map((worker) => (
              <View key={worker.id} style={styles.workerRow}>
                <View style={styles.workerInfo}>
                  <View style={styles.workerNameRow}>
                    <Text style={styles.workerName}>{worker.name}</Text>
                    <View
                      style={[
                        styles.badge,
                        worker.role === "ADMIN" ? styles.adminBadge : styles.workerBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          worker.role === "ADMIN" ? styles.adminText : styles.workerText,
                        ]}
                      >
                        {worker.role}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.workerHandle}>@{worker.username}</Text>
                  <Text style={styles.workerDate}>Added: {formatDate(worker.createdAt)}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.statusToggle, worker.active ? styles.activeBg : styles.inactiveBg]}
                  onPress={() => toggleUserActive(worker)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.toggleText, worker.active ? styles.activeText : styles.inactiveText]}>
                    {worker.active ? "Active" : "Disabled"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Enterprise API Endpoint Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mobile Connectivity</Text>
          <View style={styles.rowItem}>
            <Text style={styles.rowLabel}>Backend Host</Text>
            <Text style={styles.rowValueSmall}>{API_BASE_URL}</Text>
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.rowLabel}>Credential Persistence</Text>
            <Text style={styles.rowValueHighlight}>SecureStore Hardware Vault</Text>
          </View>
        </View>
      </ScrollView>

      {/* Add Staff Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Staff Member</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="e.g. ramesh"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Initial Password *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimum 4 characters"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone (Optional)</Text>
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
                <Text style={styles.inputLabel}>Role Permission</Text>
                <View style={styles.roleSelector}>
                  <TouchableOpacity
                    style={[styles.roleSelectBtn, role === "WORKER" && styles.roleSelectBtnActive]}
                    onPress={() => setRole("WORKER")}
                  >
                    <Text
                      style={[
                        styles.roleSelectText,
                        role === "WORKER" && styles.roleSelectTextActive,
                      ]}
                    >
                      Worker (Fulfillment only)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleSelectBtn, role === "ADMIN" && styles.roleSelectBtnActive]}
                    onPress={() => setRole("ADMIN")}
                  >
                    <Text
                      style={[
                        styles.roleSelectText,
                        role === "ADMIN" && styles.roleSelectTextActive,
                      ]}
                    >
                      Admin (Full System)
                    </Text>
                  </TouchableOpacity>
                </View>
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
                onPress={handleAddWorker}
                disabled={saving}
                accessibilityRole="button"
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Create Account</Text>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addStaffBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minHeight: 44,
    gap: 4,
  },
  addStaffText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  rowItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  rowLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  rowValueHighlight: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16a34a",
  },
  rowValueSmall: {
    fontSize: 12,
    color: "#475569",
    maxWidth: 200,
  },
  workerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  workerInfo: {
    flex: 1,
    marginRight: 12,
  },
  workerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  workerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadge: {
    backgroundColor: "#dbeafe",
  },
  workerBadge: {
    backgroundColor: "#fef3c7",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  adminText: {
    color: "#1e40af",
  },
  workerText: {
    color: "#92400e",
  },
  workerHandle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  workerDate: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  statusToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  activeBg: {
    backgroundColor: "#dcfce7",
  },
  inactiveBg: {
    backgroundColor: "#fee2e2",
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  activeText: {
    color: "#166534",
  },
  inactiveText: {
    color: "#991b1b",
  },
  errorNote: {
    color: "#ef4444",
    fontSize: 13,
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
  roleSelector: {
    gap: 8,
  },
  roleSelectBtn: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    minHeight: 44,
    justifyContent: "center",
  },
  roleSelectBtnActive: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  roleSelectText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  roleSelectTextActive: {
    color: "#2563eb",
    fontWeight: "700",
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
