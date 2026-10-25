const LABELS: Record<string, string> = {
  PENDING: "অপেক্ষমাণ",
  CONFIRMED: "নিশ্চিত করা হয়েছে",
  PROCESSING: "প্রস্তুত করা হচ্ছে",
  SHIPPED: "পাঠানো হয়েছে",
  DELIVERED: "ডেলিভারি সম্পন্ন",
  CANCELLED: "বাতিল",
};

// Bengali name of an order status, used on the website and later in the admin.
export function statusLabel(status: string): string {
  return LABELS[status] ?? status;
}