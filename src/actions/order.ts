"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { createOrder, priceOrder, OrderError } from "@/lib/orders";
import { parseOrderRequest, sanitizeItems } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

// ---------------------------------------------------------------- Quote

export type QuoteResult =
  | {
      ok: true;
      subtotalTaka: number;
      deliveryChargeTaka: number;
      discountTaka: number;
      totalTaka: number;
      couponCode: string | null;
    }
  | { ok: false; error: string; field?: string };

// Shows the customer the totals BEFORE they order.
// It saves nothing and uses exactly the same price rules as placeOrder.
export async function quoteOrder(input: unknown): Promise<QuoteResult> {
  const ip = await clientIp();
  if (!rateLimit(`quote:${ip}`, 60, 60_000)) {
    return {
      ok: false,
      error: "অনেক বেশি অনুরোধ হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
    };
  }

  const raw =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};

  const items = sanitizeItems(raw.items);
  const zoneId = typeof raw.zoneId === "string" ? raw.zoneId.slice(0, 64) : "";
  const couponCode =
    typeof raw.couponCode === "string" && raw.couponCode.trim()
      ? raw.couponCode.trim().slice(0, 40)
      : null;

  try {
    const p = await priceOrder(db, items, zoneId, couponCode);
    return {
      ok: true,
      subtotalTaka: p.subtotalTaka,
      deliveryChargeTaka: p.deliveryChargeTaka,
      discountTaka: p.discountTaka,
      totalTaka: p.totalTaka,
      couponCode: p.coupon ? p.coupon.code : null,
    };
  } catch (e) {
    if (e instanceof OrderError) {
      return { ok: false, error: e.message, field: e.field };
    }
    console.error("quoteOrder failed", e);
    return { ok: false, error: "হিসাব আনা যায়নি। আবার চেষ্টা করুন।" };
  }
}

// ---------------------------------------------------------------- Place order

export type PlaceOrderResult =
  | { ok: true; orderNo: string; token: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const ip = await clientIp();
  if (!rateLimit(`order:${ip}`, 8, 10 * 60_000)) {
    return {
      ok: false,
      error: "অল্প সময়ে অনেক অর্ডার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
    };
  }

  const parsed = parseOrderRequest(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, fieldErrors: parsed.fieldErrors };
  }

  const d = parsed.data;

  // The hidden trap field was filled in, so this is a bot.
  if (d.isBot) {
    return { ok: false, error: "অর্ডার করা যায়নি। আবার চেষ্টা করুন।" };
  }

  try {
    const created = await createOrder(db, {
      items: d.items,
      zoneId: d.zoneId,
      couponCode: d.couponCode,
      customer: {
        name: d.name,
        phone: d.phone,
        address: d.address,
        note: d.note,
      },
    });
    return { ok: true, orderNo: created.orderNo, token: created.trackingToken };
  } catch (e) {
    if (e instanceof OrderError) {
      return {
        ok: false,
        error: e.message,
        fieldErrors: e.field ? { [e.field]: e.message } : undefined,
      };
    }
    console.error("placeOrder failed", e);
    return {
      ok: false,
      error: "অর্ডার সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।",
    };
  }
}