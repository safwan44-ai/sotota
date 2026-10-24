// Pure money and number rules. No database, so they are easy to test.

// Delivery is free when the zone has a free-delivery limit and the
// products total (before any coupon) reaches it.
export function deliveryChargeFor(
  subtotalTaka: number,
  chargeTaka: number,
  freeAboveTaka: number | null
): number {
  if (freeAboveTaka !== null && subtotalTaka >= freeAboveTaka) return 0;
  return chargeTaka;
}

// Discount can never be negative and never more than the products total.
export function couponDiscount(
  type: "PERCENT" | "FIXED",
  value: number,
  subtotalTaka: number
): number {
  if (value <= 0 || subtotalTaka <= 0) return 0;
  const raw = type === "PERCENT" ? Math.floor((subtotalTaka * value) / 100) : value;
  return Math.max(0, Math.min(raw, subtotalTaka));
}

// Example: SOT261018-48213 (year, month, day in Bangladesh time + 5 digits)
export function makeOrderNo(now: Date, fiveDigits: number): string {
  const dhaka = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const ymd = dhaka.toISOString().slice(2, 10).replace(/-/g, "");
  return `SOT${ymd}-${fiveDigits}`;
}