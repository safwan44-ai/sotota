"use server";

import { db } from "@/lib/db";

const MAX_ITEMS = 50;
const MAX_QTY = 10;

export type CartLine = {
  variantId: string;
  status: "ok" | "limited" | "soldout" | "missing";
  qty: number; // quantity actually counted
  requestedQty: number; // quantity the browser asked for
  slug: string;
  productNameBn: string;
  label: string;
  unitPriceTaka: number;
  stock: number;
  lineTotalTaka: number;
};

export type CartResult = { lines: CartLine[]; subtotalTaka: number };

// Takes only IDs and quantities from the browser.
// Prices, names and stock always come from the database.
export async function getCartLines(input: unknown): Promise<CartResult> {
  const clean: { variantId: string; qty: number }[] = [];
  const seen = new Set<string>();

  if (Array.isArray(input)) {
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
  }

  if (clean.length === 0) return { lines: [], subtotalTaka: 0 };

  const variants = await db.productVariant.findMany({
    where: {
      id: { in: clean.map((c) => c.variantId) },
      isActive: true,
      product: { isActive: true },
    },
    include: { product: { select: { slug: true, nameBn: true } } },
  });

  const byId = new Map(variants.map((v) => [v.id, v]));

  const lines = clean.map((c): CartLine => {
    const v = byId.get(c.variantId);

    if (!v) {
      return {
        variantId: c.variantId,
        status: "missing",
        qty: 0,
        requestedQty: c.qty,
        slug: "",
        productNameBn: "",
        label: "",
        unitPriceTaka: 0,
        stock: 0,
        lineTotalTaka: 0,
      };
    }

    const base = {
      variantId: v.id,
      requestedQty: c.qty,
      slug: v.product.slug,
      productNameBn: v.product.nameBn,
      label: v.label,
      unitPriceTaka: v.priceTaka,
      stock: v.stock,
    };

    if (v.stock <= 0) {
      return { ...base, status: "soldout", qty: 0, lineTotalTaka: 0 };
    }

    const qty = Math.min(c.qty, v.stock, MAX_QTY);
    return {
      ...base,
      status: qty < c.qty ? "limited" : "ok",
      qty,
      lineTotalTaka: v.priceTaka * qty,
    };
  });

  const subtotalTaka = lines.reduce((sum, l) => sum + l.lineTotalTaka, 0);
  return { lines, subtotalTaka };
}