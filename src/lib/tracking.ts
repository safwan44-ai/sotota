import type { PrismaClient } from "../generated/prisma/client";
import { isValidBdMobile } from "./validators";

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

// Turns " sot261018-48213 " or Bengali digits into "SOT261018-48213".
export function normalizeOrderNo(input: string): string {
  return input
    .trim()
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/\s+/g, "")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .toUpperCase();
}

export function looksLikeOrderNo(orderNo: string): boolean {
  return /^SOT\d{6}-\d{5}$/.test(orderNo);
}

// Only what a customer may see. No address, no phone, no internal notes.
export type TrackedOrder = {
  orderNo: string;
  status: string;
  createdAt: string;
  items: { name: string; label: string; qty: number; lineTotalTaka: number }[];
  subtotalTaka: number;
  deliveryChargeTaka: number;
  discountTaka: number;
  totalTaka: number;
  zoneName: string | null;
  history: { status: string; at: string }[];
};

// Both the order number AND the phone number must match.
// Returns null for every kind of mismatch, so nothing can be guessed.
export async function findOrderForTracking(
  client: Pick<PrismaClient, "order">,
  orderNo: string,
  phone: string
): Promise<TrackedOrder | null> {
  if (!looksLikeOrderNo(orderNo) || !isValidBdMobile(phone)) return null;

  const o = await client.order.findFirst({
    where: { orderNo, phone },
    select: {
      orderNo: true,
      status: true,
      createdAt: true,
      subtotalTaka: true,
      deliveryChargeTaka: true,
      discountTaka: true,
      totalTaka: true,
      deliveryZone: { select: { name: true } },
      items: {
        select: {
          productNameBn: true,
          variantLabel: true,
          quantity: true,
          lineTotalTaka: true,
        },
      },
      history: {
        orderBy: { createdAt: "asc" },
        select: { status: true, createdAt: true },
      },
    },
  });

  if (!o) return null;

  return {
    orderNo: o.orderNo,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      name: i.productNameBn,
      label: i.variantLabel,
      qty: i.quantity,
      lineTotalTaka: i.lineTotalTaka,
    })),
    subtotalTaka: o.subtotalTaka,
    deliveryChargeTaka: o.deliveryChargeTaka,
    discountTaka: o.discountTaka,
    totalTaka: o.totalTaka,
    zoneName: o.deliveryZone ? o.deliveryZone.name : null,
    history: o.history.map((h) => ({
      status: h.status,
      at: h.createdAt.toISOString(),
    })),
  };
}