import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCart } from "../../src/context/CartContext";

export default function CustomerLayout() {
  const router = useRouter();
  const { totalBags } = useCart();

  return (
    <Tabs
      initialRouteName="catalog"
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#ffffff",
          elevation: 2,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 3,
        },
        headerTitle: () => (
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerLogoBadge}>
              <MaterialCommunityIcons name="grain" size={20} color="#b45309" />
            </View>
            <View>
              <Text style={styles.headerMainTitle}>Rajyalakshmi Radhe</Text>
              <Text style={styles.headerSubtitle}>Wholesale Grain Market · Vijayawada</Text>
            </View>
          </View>
        ),
        headerRight: () => (
          <TouchableOpacity
            style={styles.staffBtn}
            onPress={() => router.push("/login")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Staff Login"
          >
            <MaterialCommunityIcons name="account-tie-outline" size={16} color="#475569" />
            <Text style={styles.staffBtnText}>Staff</Text>
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: "#b45309",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="catalog"
        options={{
          title: "Catalog",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="storefront-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarBadge: totalBags > 0 ? totalBags : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#d97706",
            fontSize: 10,
            fontWeight: "700",
          },
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          title: "Track Order",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="truck-delivery-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: "About",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="information-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerLogoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
  },
  headerMainTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748b",
  },
  staffBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  staffBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
});
