/**
 * Formats a number as Indian Rupee (INR) currency: e.g. ₹1,25,000.00
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a date string to a human-readable Indian format: e.g. 24 Sep 2026, 09:30 AM
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

/**
 * Short date format: e.g. 24 Sep
 */
export function formatShortDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "-";
  }
}

/**
 * Weight formatter: e.g. 50 kg or 1.5 tons
 */
export function formatWeight(weight: number, unit = "kg"): string {
  return `${weight.toLocaleString("en-IN")} ${unit}`;
}
