"use client";

import Link from "next/link";
import { useCartItems, useHydrated } from "@/lib/cart-store";

export default function CartLink() {
  const items = useCartItems();
  const hydrated = useHydrated();
  const count = hydrated ? items.reduce((sum, i) => sum + i.qty, 0) : 0;

  return (
    <Link
      href="/cart"
      className="relative hover:text-forest"
      aria-label={`কার্ট, ${count} টি পণ্য`}
    >
      কার্ট
      {count > 0 && (
        <span className="absolute -right-5 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-craft px-1 text-xs font-semibold text-white">
          {count.toLocaleString("bn-BD")}
        </span>
      )}
    </Link>
  );
}