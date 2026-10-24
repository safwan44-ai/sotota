import { z } from "zod";

// ---------------------------------------------------------------- Phone

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

// Turns "+880 1712-345678" or "০১৭১২৩৪৫৬৭৮" into "01712345678".
export function normalizePhone(input: string): string {
  let s = input.trim();
  s = s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
  s = s.replace(/[\s\-().]/g, "");
  if (s.startsWith("+880")) s = "0" + s.slice(4);
  else if (s.startsWith("880")) s = "0" + s.slice(3);
  return s;
}

// Bangladeshi mobile numbers: 01 + (3 to 9) + 8 more digits.
export function isValidBdMobile(phone: string): boolean {
  return /^01[3-9]\d{8}$/.test(phone);
}

// ---------------------------------------------------------------- Cart items

export const MAX_QTY = 10;
export const MAX_ITEMS = 50;

export type OrderItemInput = { variantId: string; qty: number };

// Keeps only safe, valid items. Anything strange from the browser is dropped.
export function sanitizeItems(input: unknown): OrderItemInput[] {
  const clean: OrderItemInput[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(input)) return clean;

  for (const raw of input.slice(0, MAX_ITEMS)) {
    if (typeof raw !== "object" || raw === null) continue;
    const { variantId, qty } = raw as Record<string, unknown>;
    if (typeof variantId !== "string") continue;
    if (variantId.length === 0 || variantId.length > 64) continue;
    if (typeof qty !== "number" || !Number.isFinite(qty)) continue;
    if (seen.has(variantId)) continue;
    seen.add(variantId);
    clean.push({
      variantId,
      qty: Math.min(MAX_QTY, Math.max(1, Math.floor(qty))),
    });
  }
  return clean;
}

// ---------------------------------------------------------------- Order form

const orderSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "নাম কমপক্ষে ২ অক্ষরের হতে হবে।")
    .max(80, "নাম ৮০ অক্ষরের বেশি হতে পারবে না।"),
  phone: z
    .string()
    .trim()
    .min(1, "ফোন নম্বর দিন।")
    .max(30, "ফোন নম্বরটি সঠিক নয়।"),
  address: z
    .string()
    .trim()
    .min(10, "পুরো ঠিকানা লিখুন (কমপক্ষে ১০ অক্ষর)।")
    .max(300, "ঠিকানা ৩০০ অক্ষরের বেশি হতে পারবে না।"),
  note: z
    .string()
    .trim()
    .max(300, "মন্তব্য ৩০০ অক্ষরের বেশি হতে পারবে না।")
    .optional(),
  zoneId: z.string().trim().min(1, "ডেলিভারি এলাকা বেছে নিন।").max(64),
  couponCode: z.string().trim().max(40).nullable().optional(),
  website: z.string().max(200).optional(), // hidden trap field for bots
});

export type ParsedOrder = {
  name: string;
  phone: string;
  address: string;
  note: string | null;
  zoneId: string;
  couponCode: string | null;
  items: OrderItemInput[];
  isBot: boolean;
};

export type ParseResult =
  | { ok: true; data: ParsedOrder }
  | { ok: false; error: string; fieldErrors: Record<string, string> };

export function parseOrderRequest(input: unknown): ParseResult {
  const raw =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};

  const result = orderSchema.safeParse(raw);
  const fieldErrors: Record<string, string> = {};

  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }

  // Check the phone on its own, so every mistake is shown at once.
  const phone = normalizePhone(typeof raw.phone === "string" ? raw.phone : "");
  if (!fieldErrors.phone && !isValidBdMobile(phone)) {
    fieldErrors.phone = "সঠিক মোবাইল নম্বর দিন (যেমন ০১৭XXXXXXXX)।";
  }

  const items = sanitizeItems(raw.items);
  if (items.length === 0) fieldErrors.items = "আপনার কার্ট খালি।";

  if (!result.success || Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "ফর্মের তথ্যগুলো আবার দেখে নিন।",
      fieldErrors,
    };
  }

  const d = result.data;
  return {
    ok: true,
    data: {
      name: d.name,
      phone,
      address: d.address,
      note: d.note ? d.note : null,
      zoneId: d.zoneId,
      couponCode: d.couponCode ? d.couponCode : null,
      items,
      isBot: Boolean(d.website && d.website.length > 0),
    },
  };
}