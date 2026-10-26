export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

const LABELS: Record<string, string> = {
  PENDING: "অপেক্ষমাণ",
  CONFIRMED: "নিশ্চিত করা হয়েছে",
  PROCESSING: "প্রস্তুত করা হচ্ছে",
  SHIPPED: "পাঠানো হয়েছে",
  DELIVERED: "ডেলিভারি সম্পন্ন",
  CANCELLED: "বাতিল",
};

// Bengali name of an order status, used on the website and in the admin.
export function statusLabel(status: string): string {
  return LABELS[status] ?? status;
}

export function isOrderStatus(value: unknown): value is OrderStatusValue {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

// Where an order may go next. It only moves forward (steps may be skipped),
// and it can be cancelled any time before it is delivered.
// "Delivered" and "Cancelled" are final.
export function allowedNextStatuses(current: string): OrderStatusValue[] {
  if (!isOrderStatus(current)) return [];
  if (current === "DELIVERED" || current === "CANCELLED") return [];
  const index = ORDER_STATUSES.indexOf(current);
  const forward = ORDER_STATUSES.slice(index + 1, 5); // up to DELIVERED
  return [...forward, "CANCELLED"];
}

// Colours for the small status label in the admin.
export function statusBadgeClass(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "CONFIRMED":
      return "bg-blue-100 text-blue-800";
    case "PROCESSING":
      return "bg-indigo-100 text-indigo-800";
    case "SHIPPED":
      return "bg-purple-100 text-purple-800";
    case "DELIVERED":
      return "bg-green-100 text-green-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}