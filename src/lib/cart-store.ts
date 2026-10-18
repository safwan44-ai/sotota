"use client";

import { useSyncExternalStore } from "react";

export type CartItem = { variantId: string; qty: number };

const KEY = "sotota-cart-v1";
const MAX_QTY = 10;
const MAX_ITEMS = 50;
const EMPTY: CartItem[] = [];

let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

// The browser only remembers WHICH item and HOW MANY.
// Prices are never stored here. The server looks up real prices.
function read(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;

    const items: CartItem[] = [];
    for (const row of data.slice(0, MAX_ITEMS)) {
      if (typeof row !== "object" || row === null) continue;
      const { variantId, qty } = row as Record<string, unknown>;
      if (typeof variantId !== "string" || typeof qty !== "number") continue;
      if (!Number.isInteger(qty) || qty < 1) continue;
      items.push({ variantId, qty: Math.min(qty, MAX_QTY) });
    }
    return items.length > 0 ? items : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): CartItem[] {
  if (cache === null) cache = read();
  return cache;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  function onStorage(e: StorageEvent) {
    if (e.key === KEY || e.key === null) {
      cache = null;
      listener();
    }
  }
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(items: CartItem[]) {
  cache = items.length > 0 ? items : EMPTY;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage can be blocked. The cart then lasts only until the page reloads.
  }
  listeners.forEach((l) => l());
}

export function useCartItems(): CartItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// false on the server and during the first render, true afterwards.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function addToCart(variantId: string, qty: number) {
  const items = getSnapshot();
  const found = items.find((i) => i.variantId === variantId);

  const next = found
    ? items.map((i) =>
        i.variantId === variantId
          ? { ...i, qty: Math.min(MAX_QTY, i.qty + qty) }
          : i
      )
    : [...items, { variantId, qty: Math.min(MAX_QTY, Math.max(1, qty)) }];

  write(next.slice(0, MAX_ITEMS));
}

export function setCartQty(variantId: string, qty: number) {
  const safe = Math.min(MAX_QTY, Math.max(1, Math.floor(qty)));
  write(
    getSnapshot().map((i) =>
      i.variantId === variantId ? { ...i, qty: safe } : i
    )
  );
}

export function removeFromCart(variantId: string) {
  write(getSnapshot().filter((i) => i.variantId !== variantId));
}