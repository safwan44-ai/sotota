"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/validators";
import {
  findOrderForTracking,
  normalizeOrderNo,
  type TrackedOrder,
} from "@/lib/tracking";

export type TrackResult =
  | { ok: true; order: TrackedOrder }
  | { ok: false; error: string };

const NOT_FOUND =
  "এই অর্ডার নম্বর ও ফোন নম্বর দিয়ে কোনো অর্ডার পাওয়া যায়নি। নম্বর দুটি আবার দেখে নিন।";

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function trackOrder(input: unknown): Promise<TrackResult> {
  const raw =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};

  const orderNo = normalizeOrderNo(
    typeof raw.orderNo === "string" ? raw.orderNo.slice(0, 40) : ""
  );
  const phone = normalizePhone(
    typeof raw.phone === "string" ? raw.phone.slice(0, 30) : ""
  );

  // Slows down anyone trying many guesses.
  const ip = await clientIp();
  if (
    !rateLimit(`track-ip:${ip}`, 12, 10 * 60_000) ||
    !rateLimit(`track-no:${orderNo}`, 8, 10 * 60_000)
  ) {
    return {
      ok: false,
      error: "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
    };
  }

  try {
    const order = await findOrderForTracking(db, orderNo, phone);
    if (!order) return { ok: false, error: NOT_FOUND };
    return { ok: true, order };
  } catch (e) {
    console.error("trackOrder failed", e);
    return { ok: false, error: "এখন অর্ডার দেখা যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।" };
  }
}