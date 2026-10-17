import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../src/hooks/useAuth";
import { HeaderBar } from "../src/components/HeaderBar";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const confirmLogout = () => {
    Alert.alert(
      "Confirm Sign Out",
      "Are you sure you want to log out of your session? All cached authentication tokens will be securely purged.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: executeLogout,
        },
      ]
    );
  };

  const executeLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } catch (err: any) {
      Alert.alert("Logout Notice", err.message || "Session ended.");
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <HeaderBar title="Profile & Account" showBack showProfile={false} />

      <ScrollView contentContainerStyle={styles.container}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || "Authenticated User"}</Text>
          <Text style={styles.userHandle}>@{user?.username}</Text>

          <View
            style={[
              styles.roleBadge,
              user?.role === "ADMIN" ? styles.adminBadge : styles.workerBadge,
            ]}
          >
            <MaterialCommunityIcons
              name={user?.role === "ADMIN" ? "shield-check" : "account-hard-hat"}
              size={16}
              color={user?.role === "ADMIN" ? "#1e40af" : "#92400e"}
            />
            <Text
              style={[
                styles.roleText,
                { color: user?.role === "ADMIN" ? "#1e40af" : "#92400e" },
              ]}
            >
              {user?.role === "ADMIN" ? "SYSTEM ADMINISTRATOR" : "STORE WORKER"}
            </Text>
          </View>
        </View>

        {/* Account Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>

          <View style={styles.rowItem}>
            <Text style={styles.rowLabel}>Username</Text>
            <Text style={styles.rowValue}>{user?.username || "-"}</Text>
          </View>

          <View style={styles.rowItem}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{user?.email || "Not specified"}</Text>
          </View>

          <View style={styles.rowItem}>
            <Text style={styles.rowLabel}>Role Boundary</Text>
            <Text style={styles.rowValue}>
              {user?.role === "ADMIN" ? "Full Access (Admin)" : "Fulfillment Only (Worker)"}
            </Text>
          </View>
        </View>


        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={confirmLogout}
          disabled={loggingOut}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Sign out from mobile app"
        >
          {loggingOut ? (
            <ActivityIndicator color="#ef4444" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="logout" size={20} color="#ef4444" style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Sign Out & Invalidate Session</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarLargeText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  userHandle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  adminBadge: {
    backgroundColor: "#dbeafe",
  },
  workerBadge: {
    backgroundColor: "#fef3c7",
  },
  roleText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 0.5,
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
    fontSize: 14,
    color: "#64748b",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fecaca",
    height: 52,
    borderRadius: 14,
    marginTop: 10,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "700",
  },
});
