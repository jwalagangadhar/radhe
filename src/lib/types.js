export const WEIGHT_VARIANTS = [
    { id: "250g", label: "¼ kg (250g Pack)", shortLabel: "¼ kg (250g)", multiplier: 0.25, isRetailUnit: true, isBag: false },
    { id: "500g", label: "½ kg (500g Pack)", shortLabel: "½ kg (500g)", multiplier: 0.5, isRetailUnit: true, isBag: false },
    { id: "1kg", label: "1 kg Pack", shortLabel: "1 kg", multiplier: 1.0, isRetailUnit: true, isBag: false },
    { id: "5kg", label: "5 kg Pack", shortLabel: "5 kg", multiplier: 5.0, isRetailUnit: true, isBag: false },
    { id: "25kg_bag", label: "🎒 25 kg Wholesale Bag", shortLabel: "🎒 25 kg Bag", multiplier: 25.0, isRetailUnit: false, isBag: true },
    { id: "30kg_bag", label: "🎒 30 kg Wholesale Bag", shortLabel: "🎒 30 kg Bag", multiplier: 30.0, isRetailUnit: false, isBag: true },
    { id: "50kg_bag", label: "🎒 50 kg Wholesale Bag", shortLabel: "🎒 50 kg Bag", multiplier: 50.0, isRetailUnit: false, isBag: true },
];
export function getAvailableWeightVariants(isGstBill) {
    if (isGstBill) {
        // GST Bills only allow Wholesale Bags
        return WEIGHT_VARIANTS.filter((v) => v.isBag);
    }
    // Non-GST Bills allow all variants (small unit packs ¼kg, ½kg, 1kg, 5kg and bulk bags)
    return WEIGHT_VARIANTS;
}
/**
 * Helper to determine default category recommendation in Non-GST:
 * If price >= ₹900 or unit is 'bag', default is "BAG" (Wholesale Bag count).
 * Otherwise, default is "PACKET" (Retail 250g, 500g, 1kg, 5kg).
 */
export function getDefaultNonGstCategory(price, unit) {
    if (unit?.toLowerCase() === "bag" || unit?.toLowerCase() === "bags")
        return "BAG";
    if (price >= 900)
        return "BAG";
    return "PACKET";
}
/**
 * Returns the effective whole-bag price for a product.
 * If product unit is 'bag' or price >= 900 (already bag priced), returns base price.
 * If product unit is 'kg' and price < 900, multiplies by bag weight.
 */
export function getProductBagPrice(product, mode = "NON_GST") {
    const basePrice = mode === "GST"
        ? (product.counterGstPrice ?? product.price)
        : mode === "WEB"
            ? (product.webPrice ?? product.price)
            : (product.counterPrice ?? product.price);
    const bagW = product.bagWeight && product.bagWeight > 0 ? product.bagWeight : 30;
    const isBagUnit = product.unit?.toLowerCase() === "bag" || product.unit?.toLowerCase() === "bags";
    if (isBagUnit || basePrice >= 900) {
        return Math.round(basePrice);
    }
    return Math.round(basePrice * bagW);
}
/**
 * Returns the effective per-kg base price for computing retail packets (250g, 500g, 1kg, 5kg).
 */
export function getProductKgPrice(product, mode = "NON_GST") {
    const basePrice = mode === "GST"
        ? (product.counterGstPrice ?? product.price)
        : mode === "WEB"
            ? (product.webPrice ?? product.price)
            : (product.counterPrice ?? product.price);
    const bagW = product.bagWeight && product.bagWeight > 0 ? product.bagWeight : 30;
    const isBagUnit = product.unit?.toLowerCase() === "bag" || product.unit?.toLowerCase() === "bags";
    if (isBagUnit && basePrice >= 900) {
        return Math.round((basePrice / bagW) * 100) / 100;
    }
    return basePrice;
}
export function getProductWeightVariants(product, isGstBill = false) {
    const isBagCount = product.availability === "BOTH" || product.unit?.toLowerCase() === "bag" || product.unit?.toLowerCase() === "bags";
    const bagWeight = product.bagWeight && product.bagWeight > 0 ? product.bagWeight : 30;
    const adminBagVariant = {
        id: `${bagWeight}kg_bag`,
        label: `🎒 1 Bag (${bagWeight} kg)`,
        shortLabel: `1 Bag (${bagWeight}kg)`,
        multiplier: isBagCount ? 1.0 : bagWeight,
        isRetailUnit: false,
        isBag: true,
    };
    // 1. GST Bills and Website strictly sell by Wholesale Bag Count ONLY
    if (isGstBill) {
        return [adminBagVariant];
    }
    // 2. Non-GST Mode: Return BOTH Bag Count category and Packet Count category
    const variants = [adminBagVariant];
    // If product has explicit child variants created from manual entry
    if (product.variants && product.variants.length > 0) {
        const list = [];
        list.push({ id: "1kg", label: "1 kg Pack", shortLabel: "1 kg", multiplier: 1.0, isRetailUnit: true, isBag: false });
        for (const v of product.variants) {
            const u = v.unit?.toLowerCase();
            if (u === "500g" || u === "500gm") {
                list.push({ id: "500g", label: "500 gm (½ kg)", shortLabel: "500 gm", multiplier: 0.5, isRetailUnit: true, isBag: false });
            }
            else if (u === "250g" || u === "250gm") {
                list.push({ id: "250g", label: "250 gm (¼ kg)", shortLabel: "250 gm", multiplier: 0.25, isRetailUnit: true, isBag: false });
            }
            else if (u === "5kg") {
                list.push({ id: "5kg", label: "5 kg Pack", shortLabel: "5 kg", multiplier: 5.0, isRetailUnit: true, isBag: false });
            }
        }
        return [...variants, ...list];
    }
    // Standard Non-GST Retail Packet Packs: 250g, 500g, 1kg, 5kg
    variants.push({ id: "250g", label: "250 gm (¼ kg)", shortLabel: "250 gm", multiplier: 0.25, isRetailUnit: true, isBag: false }, { id: "500g", label: "500 gm (½ kg)", shortLabel: "500 gm", multiplier: 0.5, isRetailUnit: true, isBag: false }, { id: "1kg", label: "1 kg Pack", shortLabel: "1 kg", multiplier: 1.0, isRetailUnit: true, isBag: false }, { id: "5kg", label: "5 kg Pack", shortLabel: "5 kg", multiplier: 5.0, isRetailUnit: true, isBag: false });
    return variants;
}
export function calculateVariantPrice(basePricePerKg, variant) {
    if (variant.isBag) {
        // If multiplier is already 1.0 (bag priced), return basePricePerKg directly
        if (variant.multiplier === 1.0) {
            return Math.round(basePricePerKg * 100) / 100;
        }
        return Math.round(basePricePerKg * variant.multiplier);
    }
    if (variant.id === "500g" && variant.multiplier === 0.5) {
        // If 1 kg is ₹150, half is ₹75, half + ₹2 = ₹77
        return Math.round((basePricePerKg * 0.5 + 2) * 100) / 100;
    }
    if (variant.id === "250g" && (variant.multiplier === 0.25 || variant.multiplier === 250 / 1000)) {
        return Math.round((basePricePerKg * 0.25 + 1) * 100) / 100;
    }
    return Math.round(basePricePerKg * variant.multiplier * 100) / 100;
}
export function formatVariantProductName(productName, variant, bagWeight = 30) {
    const baseName = productName.replace(/^(?:1\s*kg|1kg)\s*[-:]?\s*/i, "").trim() || productName;
    if (variant.id === "1kg") {
        return `1kg ${baseName}`;
    }
    if (variant.id === "500g") {
        return `500gm ${baseName}`;
    }
    if (variant.id === "250g") {
        return `250gm ${baseName}`;
    }
    if (variant.id === "5kg") {
        return `5kg ${baseName}`;
    }
    if (variant.isBag) {
        return `1 Bag ${baseName} (${bagWeight}kg)`;
    }
    return `${baseName} (${variant.shortLabel})`;
}
export const CATEGORIES = [
    "All",
    "Dals",
    "Atta & Grains",
    "Rice",
    "Spices",
];
export function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}
export function formatQuantity(qty, unit) {
    const rounded = Number.isInteger(qty) ? qty : qty.toFixed(2);
    return `${rounded} ${unit}`;
}
export function stockLabel(stock, unit) {
    if (stock <= 0)
        return "Out of stock";
    if (stock < 5)
        return `Low stock (${formatQuantity(stock, unit)})`;
    return `In stock (${formatQuantity(stock, unit)})`;
}
export function orderStatusLabel(status) {
    const labels = {
        PENDING: "Pending",
        DRAFT: "Draft",
        APPROVED: "Approved",
        PACKING: "Packing",
        INVOICED: "Invoiced",
        COMPLETED: "Completed",
        CANCELLED: "Cancelled",
    };
    return labels[status] ?? status;
}
export function orderTypeLabel(type) {
    return type === "WEB" ? "Online" : "Walk-in";
}
