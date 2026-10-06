import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function CustomerAboutScreen() {
  const router = useRouter();

  const handleCall = () => {
    Linking.openURL("tel:+919876543210");
  };

  const handleWhatsApp = () => {
    Linking.openURL("https://wa.me/919876543210?text=Hello%20Rajyalakshmi%20Traders,%20I%20want%20to%20inquire%20about%20wholesale%20rates");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Banner */}
      <View style={styles.heroCard}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="grain" size={36} color="#ffffff" />
        </View>
        <Text style={styles.heroSubtitle}>Established in Vijayawada</Text>
        <Text style={styles.heroTitle}>Rajyalakshmi Radhe Wholesale & Retail Traders</Text>
        <Text style={styles.heroDesc}>
          Supplying pure pulses, Sortex-cleaned dals, premium basmati rice, and stone-ground atta directly from the heart of Andhra Pradesh.
        </Text>
      </View>

      {/* Highlights */}
      <View style={styles.highlightsGrid}>
        <View style={styles.highlightCard}>
          <MaterialCommunityIcons name="shield-check-outline" size={24} color="#b45309" />
          <Text style={styles.highlightTitle}>100% Sortex Clean</Text>
          <Text style={styles.highlightDesc}>Machine-cleaned to zero impurities, no dust or stones.</Text>
        </View>

        <View style={styles.highlightCard}>
          <MaterialCommunityIcons name="package-variant" size={24} color="#b45309" />
          <Text style={styles.highlightTitle}>Wholesale Sealed Bags</Text>
          <Text style={styles.highlightDesc}>Packed in hygienic 25kg to 50kg moisture-proof sacks.</Text>
        </View>

        <View style={styles.highlightCard}>
          <MaterialCommunityIcons name="truck-fast-outline" size={24} color="#b45309" />
          <Text style={styles.highlightTitle}>Fast Transport</Text>
          <Text style={styles.highlightDesc}>Daily lorry dispatch across AP, Telangana & neighbouring hubs.</Text>
        </View>

        <View style={styles.highlightCard}>
          <MaterialCommunityIcons name="handshake-outline" size={24} color="#b45309" />
          <Text style={styles.highlightTitle}>Fair Mill Rates</Text>
          <Text style={styles.highlightDesc}>Direct mill sourcing ensures unmatchable bulk pricing.</Text>
        </View>
      </View>

      {/* Godown & Market Location */}
      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <MaterialCommunityIcons name="map-marker-radius" size={22} color="#b45309" />
          <Text style={styles.locationTitle}>Wholesale Godown Location</Text>
        </View>
        <Text style={styles.addressText}>
          Shop No. 14, Main Commercial Street,{"\n"}
          Gollapudi Wholesale Grain Market,{"\n"}
          Vijayawada, Andhra Pradesh - 521225
        </Text>

        <View style={styles.contactActions}>
          <TouchableOpacity style={styles.contactBtn} onPress={handleCall} activeOpacity={0.8}>
            <MaterialCommunityIcons name="phone" size={18} color="#ffffff" />
            <Text style={styles.contactBtnText}>Call Godown</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.contactBtn, styles.whatsappBtn]} onPress={handleWhatsApp} activeOpacity={0.8}>
            <MaterialCommunityIcons name="whatsapp" size={18} color="#ffffff" />
            <Text style={styles.contactBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Staff Login Link */}
      <View style={styles.staffCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.staffTitle}>Store Staff or Admin?</Text>
          <Text style={styles.staffDesc}>Login to access counter POS, godown stock, and ERP.</Text>
        </View>
        <TouchableOpacity
          style={styles.staffLoginBtn}
          onPress={() => router.push("/login")}
          activeOpacity={0.8}
        >
          <Text style={styles.staffLoginBtnText}>Staff Portal</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color="#2563eb" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    backgroundColor: "#78350f",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fde68a",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 24,
  },
  heroDesc: {
    fontSize: 13,
    color: "#fef3c7",
    textAlign: "center",
    lineHeight: 18,
  },
  highlightsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  highlightCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
  },
  highlightTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  highlightDesc: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 15,
  },
  locationCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  addressText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
  },
  contactActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  contactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#b45309",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  whatsappBtn: {
    backgroundColor: "#16a34a",
  },
  contactBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  staffCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 12,
    marginBottom: 8,
  },
  staffTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e3a8a",
  },
  staffDesc: {
    fontSize: 11,
    color: "#3b82f6",
    marginTop: 2,
  },
  staffLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  staffLoginBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },
});
