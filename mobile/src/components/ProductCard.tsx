import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Product } from "../types/models";
import { formatCurrency } from "../utils/formatters";

interface ProductCardProps {
  product: Product;
  isAdmin?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isAdmin = false,
  onPress,
  onEdit,
  onDelete,
}) => {
  const isLowStock = product.stock <= product.minStock;
  const isOutOfStock = product.stock <= 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Product ${product.name}, Price ${formatCurrency(product.price)}, Stock ${product.stock} ${product.unit}`}
    >
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="package-variant-closed" size={24} color="#2563eb" />
        </View>

        <View style={styles.details}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {product.name}
            </Text>
            <View
              style={[
                styles.stockBadge,
                isOutOfStock
                  ? styles.outOfStockBadge
                  : isLowStock
                  ? styles.lowStockBadge
                  : styles.inStockBadge,
              ]}
            >
              <Text
                style={[
                  styles.stockBadgeText,
                  isOutOfStock
                    ? styles.outOfStockText
                    : isLowStock
                    ? styles.lowStockText
                    : styles.inStockText,
                ]}
              >
                {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
              </Text>
            </View>
          </View>

          <Text style={styles.category}>{product.category}</Text>

          <View style={styles.priceStockRow}>
            <View>
              <Text style={styles.priceLabel}>Selling Price</Text>
              <Text style={styles.price}>{formatCurrency(product.price)}</Text>
            </View>

            <View style={styles.stockCol}>
              <Text style={styles.stockLabel}>Available Stock</Text>
              <Text style={[styles.stockValue, isLowStock ? styles.lowStockColor : null]}>
                {product.stock} {product.unit}
              </Text>
            </View>
          </View>

          {/* Admin-only cost margin section */}
          {isAdmin && product.costPrice !== undefined && (
            <View style={styles.adminMarginRow}>
              <View style={styles.marginChip}>
                <Text style={styles.marginLabel}>Cost: </Text>
                <Text style={styles.marginValue}>{formatCurrency(product.costPrice)}</Text>
              </View>
              <View style={styles.marginChip}>
                <Text style={styles.marginLabel}>Margin: </Text>
                <Text style={styles.profitValue}>
                  +{formatCurrency(product.price - (product.costPrice || 0))}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Admin Action Row */}
      {isAdmin && (onEdit || onDelete) && (
        <View style={styles.actionRow}>
          {onEdit && (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              accessibilityRole="button"
              accessibilityLabel="Edit product"
            >
              <MaterialCommunityIcons name="pencil-outline" size={16} color="#2563eb" />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              accessibilityRole="button"
              accessibilityLabel="Delete product"
            >
              <MaterialCommunityIcons name="trash-can-outline" size={16} color="#ef4444" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  content: {
    flexDirection: "row",
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  details: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inStockBadge: {
    backgroundColor: "#dcfce7",
  },
  lowStockBadge: {
    backgroundColor: "#fef3c7",
  },
  outOfStockBadge: {
    backgroundColor: "#fee2e2",
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  inStockText: {
    color: "#166534",
  },
  lowStockText: {
    color: "#92400e",
  },
  outOfStockText: {
    color: "#991b1b",
  },
  category: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 10,
  },
  priceStockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 11,
    color: "#94a3b8",
  },
  price: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  stockCol: {
    alignItems: "flex-end",
  },
  stockLabel: {
    fontSize: 11,
    color: "#94a3b8",
  },
  stockValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },
  lowStockColor: {
    color: "#d97706",
  },
  adminMarginRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  marginChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  marginLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  marginValue: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  profitValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16a34a",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    minHeight: 44,
    minWidth: 80,
    justifyContent: "center",
    gap: 4,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563eb",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    minHeight: 44,
    minWidth: 80,
    justifyContent: "center",
    gap: 4,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ef4444",
  },
});
