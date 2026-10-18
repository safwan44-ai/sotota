"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCartLines, type CartResult } from "@/actions/cart";
import {
  useCartItems,
  useHydrated,
  setCartQty,
  removeFromCart,
} from "@/lib/cart-store";
import { taka } from "@/lib/format";

export default function CartView() {
  const items = useCartItems();
  const hydrated = useHydrated();
  const [data, setData] = useState<CartResult | null>(null);
  const [failed, setFailed] = useState(false);

  // Ask the server for the real prices and stock whenever the cart changes.
  useEffect(() => {
    if (!hydrated || items.length === 0) return;

    let cancelled = false;
    getCartLines(items)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, items]);

  if (!hydrated) {
    return <p className="mt-8 text-charcoal/70">লোড হচ্ছে…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-craft/30 bg-white p-8 text-center">
        <p className="text-lg">আপনার কার্ট খালি।</p>
        <Link
          href="/shop"
          className="mt-4 inline-block rounded-lg bg-forest px-6 py-3 font-semibold text-white"
        >
          পণ্য দেখুন
        </Link>
      </div>
    );
  }

  if (failed && !data) {
    return (
      <div className="mt-8 rounded-xl border border-red-300 bg-red-50 p-6">
        <p className="text-red-800">
          কার্ট লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 rounded-lg bg-forest px-5 py-2 text-white"
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  }

  if (!data) {
    return <p className="mt-8 text-charcoal/70">কার্ট লোড হচ্ছে…</p>;
  }

  // Hide lines that were just removed while the server answer is on its way.
  const lines = data.lines.filter((l) =>
    items.some((i) => i.variantId === l.variantId)
  );
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotalTaka, 0);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
      <ul className="space-y-4">
        {lines.map((l) => {
          const maxQty = Math.min(l.stock, 10);
          const unavailable = l.status === "missing" || l.status === "soldout";

          return (
            <li
              key={l.variantId}
              className="rounded-xl border border-craft/30 bg-white p-4"
            >
              {l.status === "missing" ? (
                <p className="text-red-700">এই পণ্যটি আর পাওয়া যাচ্ছে না।</p>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/product/${l.slug}`}
                      className="font-semibold text-forest hover:underline"
                    >
                      {l.productNameBn}
                    </Link>
                    <p className="text-sm text-charcoal/70">
                      ওজন: {l.label} · প্রতি পিস {taka(l.unitPriceTaka)}
                    </p>
                    {l.status === "soldout" && (
                      <p className="mt-1 text-sm text-red-700">
                        স্টক নেই। এটি মোট দামে ধরা হয়নি।
                      </p>
                    )}
                    {l.status === "limited" && (
                      <p className="mt-1 text-sm text-yellow-800">
                        স্টকে মাত্র {l.stock.toLocaleString("bn-BD")} টি আছে,
                        তাই {l.qty.toLocaleString("bn-BD")} টি ধরা হয়েছে।
                      </p>
                    )}
                  </div>
                  {!unavailable && (
                    <p className="font-semibold">{taka(l.lineTotalTaka)}</p>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                {!unavailable ? (
                  <div className="inline-flex items-center rounded-lg border border-craft/40">
                    <button
                      type="button"
                      aria-label="কমান"
                      disabled={l.qty <= 1}
                      onClick={() => setCartQty(l.variantId, l.qty - 1)}
                      className="px-4 py-1.5 text-lg disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="min-w-10 text-center">
                      {l.qty.toLocaleString("bn-BD")}
                    </span>
                    <button
                      type="button"
                      aria-label="বাড়ান"
                      disabled={l.qty >= maxQty}
                      onClick={() => setCartQty(l.variantId, l.qty + 1)}
                      className="px-4 py-1.5 text-lg disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <span />
                )}

                <button
                  type="button"
                  onClick={() => removeFromCart(l.variantId)}
                  className="text-sm text-red-700 hover:underline"
                >
                  বাদ দিন
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-xl border border-craft/30 bg-white p-5">
        <h2 className="text-lg font-semibold text-forest">অর্ডারের সারাংশ</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>পণ্যের মোট দাম</dt>
            <dd className="font-medium">{taka(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-charcoal/70">
            <dt>ডেলিভারি চার্জ</dt>
            <dd>চেকআউটে যোগ হবে</dd>
          </div>
        </dl>

        <button
          type="button"
          disabled
          className="mt-5 w-full cursor-not-allowed rounded-lg bg-craft/60 px-6 py-3 font-semibold text-white"
        >
          চেকআউট (শীঘ্রই)
        </button>

        <p className="mt-3 text-xs text-charcoal/70">
          অর্ডার নিশ্চিত করার সময় সার্ভার আবার দাম ও স্টক মিলিয়ে দেখবে।
        </p>
      </aside>
    </div>
  );
}