import { randomInt } from "node:crypto";
import type { PrismaClient } from "../generated/prisma/client";
import { taka } from "./format";
import { couponDiscount, deliveryChargeFor, makeOrderNo } from "./pricing";
import type { OrderItemInput } from "./validators";

// An error whose message is safe and friendly to show to the customer.
export class OrderError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = "OrderError";
    this.field = field;
  }
}

type Reader = Pick<PrismaClient, "productVariant" | "deliveryZone" | "coupon">;

export type PricedLine = {
  variantId: string;
  productNameBn: string;
  variantLabel: string;
  unitPriceTaka: number;
  quantity: number;
  lineTotalTaka: number;
};

export type PricedOrder = {
  lines: PricedLine[];
  subtotalTaka: number;
  deliveryChargeTaka: number;
  discountTaka: number;
  totalTaka: number;
  zone: { id: string; name: string };
  coupon: { id: string; code: string; usedCount: number; limited: boolean } | null;
};

const bn = (n: number) => n.toLocaleString("bn-BD");

// The ONE place where prices and totals are decided.
// Prices, stock, delivery charge and coupons all come from the database.
export async function priceOrder(
  client: Reader,
  items: OrderItemInput[],
  zoneId: string,
  couponCode: string | null
): Promise<PricedOrder> {
  if (items.length === 0) throw new OrderError("আপনার কার্ট খালি।", "items");

  const variants = await client.productVariant.findMany({
    where: {
      id: { in: items.map((i) => i.variantId) },
      isActive: true,
      product: { isActive: true },
    },
    include: { product: { select: { nameBn: true } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v] as const));

  const lines: PricedLine[] = [];
  for (const item of items) {
    const v = byId.get(item.variantId);
    if (!v) {
      throw new OrderError(
        "কার্টের একটি পণ্য আর পাওয়া যাচ্ছে না। কার্ট থেকে সেটি বাদ দিন।",
        "items"
      );
    }
    if (v.stock < item.qty) {
      const name = `${v.product.nameBn} (${v.label})`;
      throw new OrderError(
        v.stock <= 0
          ? `"${name}" এর স্টক নেই।`
          : `"${name}" এর স্টকে মাত্র ${bn(v.stock)} টি আছে।`,
        "items"
      );
    }
    lines.push({
      variantId: v.id,
      productNameBn: v.product.nameBn,
      variantLabel: v.label,
      unitPriceTaka: v.priceTaka,
      quantity: item.qty,
      lineTotalTaka: v.priceTaka * item.qty,
    });
  }

  const subtotalTaka = lines.reduce((sum, l) => sum + l.lineTotalTaka, 0);

  const zone = await client.deliveryZone.findFirst({
    where: { id: zoneId, isActive: true },
  });
  if (!zone) throw new OrderError("ডেলিভারি এলাকা বেছে নিন।", "zoneId");

  const deliveryChargeTaka = deliveryChargeFor(
    subtotalTaka,
    zone.chargeTaka,
    zone.freeAboveTaka
  );

  let discountTaka = 0;
  let coupon: PricedOrder["coupon"] = null;

  if (couponCode) {
    const found = await client.coupon.findFirst({
      where: { code: { equals: couponCode, mode: "insensitive" } },
    });

    if (!found || !found.isActive) {
      throw new OrderError("এই কুপন কোডটি সঠিক নয়।", "coupon");
    }
    if (found.expiresAt && found.expiresAt.getTime() < Date.now()) {
      throw new OrderError("এই কুপনের মেয়াদ শেষ হয়ে গেছে।", "coupon");
    }
    if (found.maxUses !== null && found.usedCount >= found.maxUses) {
      throw new OrderError("এই কুপনটি আর ব্যবহার করা যাবে না।", "coupon");
    }
    if (subtotalTaka < found.minOrderTaka) {
      throw new OrderError(
        `এই কুপন ব্যবহার করতে কমপক্ষে ${taka(found.minOrderTaka)} টাকার পণ্য কিনতে হবে।`,
        "coupon"
      );
    }

    discountTaka = couponDiscount(found.type, found.value, subtotalTaka);
    coupon = {
      id: found.id,
      code: found.code,
      usedCount: found.usedCount,
      limited: found.maxUses !== null,
    };
  }

  return {
    lines,
    subtotalTaka,
    deliveryChargeTaka,
    discountTaka,
    totalTaka: subtotalTaka + deliveryChargeTaka - discountTaka,
    zone: { id: zone.id, name: zone.name },
    coupon,
  };
}

export type CustomerInfo = {
  name: string;
  phone: string;
  address: string;
  note: string | null;
};

export type CreatedOrder = {
  orderNo: string;
  trackingToken: string;
  totalTaka: number;
};

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: unknown }).code === "P2002"
  );
}

// Creates the order. Everything happens in ONE database transaction:
// if any step fails, nothing is saved and no stock is taken.
export async function createOrder(
  client: PrismaClient,
  args: {
    items: OrderItemInput[];
    zoneId: string;
    couponCode: string | null;
    customer: CustomerInfo;
  }
): Promise<CreatedOrder> {
  // Stops one phone number from flooding the shop with orders.
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await client.order.count({
    where: { phone: args.customer.phone, createdAt: { gte: since } },
  });
  if (recent >= 5) {
    throw new OrderError(
      "এই ফোন নম্বর থেকে অল্প সময়ে অনেক অর্ডার এসেছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
      "phone"
    );
  }

  for (let attempt = 1; attempt <= 4; attempt++) {
    const orderNo = makeOrderNo(new Date(), randomInt(10000, 100000));

    try {
      return await client.$transaction(
        async (tx) => {
          // 1. Price everything again from the database.
          const priced = await priceOrder(
            tx,
            args.items,
            args.zoneId,
            args.couponCode
          );

          // 2. Take stock. This only succeeds if enough stock is still there,
          //    so two customers can never buy the last item together.
          for (const line of priced.lines) {
            const res = await tx.productVariant.updateMany({
              where: {
                id: line.variantId,
                isActive: true,
                stock: { gte: line.quantity },
              },
              data: { stock: { decrement: line.quantity } },
            });
            if (res.count !== 1) {
              throw new OrderError(
                `"${line.productNameBn} (${line.variantLabel})" এর স্টক এইমাত্র কমে গেছে। কার্ট দেখে আবার চেষ্টা করুন।`,
                "items"
              );
            }
          }

          // 3. Count the coupon use.
          if (priced.coupon) {
            const res = await tx.coupon.updateMany({
              where: priced.coupon.limited
                ? { id: priced.coupon.id, usedCount: priced.coupon.usedCount }
                : { id: priced.coupon.id },
              data: { usedCount: { increment: 1 } },
            });
            if (res.count !== 1) {
              throw new OrderError(
                "কুপনটি এইমাত্র ব্যবহার হয়ে গেছে। আবার চেষ্টা করুন।",
                "coupon"
              );
            }
          }

          // 4. Save the order with a snapshot of names and prices.
          const order = await tx.order.create({
            data: {
              orderNo,
              customerName: args.customer.name,
              phone: args.customer.phone,
              address: args.customer.address,
              note: args.customer.note,
              deliveryZoneId: priced.zone.id,
              couponId: priced.coupon ? priced.coupon.id : null,
              subtotalTaka: priced.subtotalTaka,
              deliveryChargeTaka: priced.deliveryChargeTaka,
              discountTaka: priced.discountTaka,
              totalTaka: priced.totalTaka,
              paymentMethod: "COD",
              status: "PENDING",
              items: {
                create: priced.lines.map((l) => ({
                  variantId: l.variantId,
                  productNameBn: l.productNameBn,
                  variantLabel: l.variantLabel,
                  unitPriceTaka: l.unitPriceTaka,
                  quantity: l.quantity,
                  lineTotalTaka: l.lineTotalTaka,
                })),
              },
              history: {
                create: {
                  status: "PENDING",
                  changedBy: "customer",
                  note: "অর্ডার গ্রহণ করা হয়েছে",
                },
              },
            },
            select: { orderNo: true, trackingToken: true, totalTaka: true },
          });

          return order;
        },
        { maxWait: 10_000, timeout: 20_000 }
      );
    } catch (e) {
      // Very rarely two orders get the same number. Try a new number.
      if (isUniqueViolation(e) && attempt < 4) continue;
      throw e;
    }
  }

  throw new OrderError("অর্ডার নম্বর তৈরি করা যায়নি। আবার চেষ্টা করুন।");
}