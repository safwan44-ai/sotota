"use client";

import { useState } from "react";
import { taka } from "@/lib/format";

type Cost = {
  raw: number;
  packaging: number;
  other: number;
  isSample: boolean;
};

type Variant = {
  id: string;
  label: string;
  priceTaka: number;
  inStock: boolean;
  maxQty: number;
  // null unless the owner chose to make this cost breakdown public
  cost: Cost | null;
};

export default function ProductPurchase({ variants }: { variants: Variant[] }) {
  const firstChoice = variants.find((v) => v.inStock) ?? variants[0];
  const [selectedId, setSelectedId] = useState(firstChoice.id);
  const [qty, setQty] = useState(1);

  const selected = variants.find((v) => v.id === selectedId) ?? firstChoice;

  function choose(id: string) {
    setSelectedId(id);
    setQty(1);
  }

  const cost = selected.cost;
  const totalCost = cost ? cost.raw + cost.packaging + cost.other : 0;
  const remaining = cost ? selected.priceTaka - totalCost : 0;

  return (
    <div className="mt-6">
      {/* Weight */}
      <p className="text-sm font-medium">ওজন বেছে নিন</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {variants.map((v) => (
          <button
            key={v.id}
            type="button"
            disabled={!v.inStock}
            aria-pressed={v.id === selected.id}
            onClick={() => choose(v.id)}
            className={
              "rounded-lg border px-4 py-2 text-sm font-medium " +
              (v.id === selected.id
                ? "border-forest bg-forest text-white"
                : "border-craft/40 bg-white text-charcoal hover:border-forest") +
              (!v.inStock ? " cursor-not-allowed opacity-50" : "")
            }
          >
            {v.label}
            {!v.inStock && " (স্টক নেই)"}
          </button>
        ))}
      </div>

      {/* Price */}
      <p className="mt-6 text-3xl font-bold text-forest">
        {taka(selected.priceTaka)}
      </p>
      <p
        className={
          "mt-1 text-sm " + (selected.inStock ? "text-forest" : "text-red-700")
        }
      >
        {selected.inStock ? "স্টকে আছে" : "স্টক নেই"}
      </p>

      {/* Quantity */}
      {selected.inStock && (
        <div className="mt-6">
          <p className="text-sm font-medium">পরিমাণ</p>
          <div className="mt-2 inline-flex items-center rounded-lg border border-craft/40 bg-white">
            <button
              type="button"
              aria-label="কমান"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="px-4 py-2 text-lg"
            >
              −
            </button>
            <span className="min-w-10 text-center font-medium">
              {qty.toLocaleString("bn-BD")}
            </span>
            <button
              type="button"
              aria-label="বাড়ান"
              onClick={() => setQty((q) => Math.min(selected.maxQty, q + 1))}
              className="px-4 py-2 text-lg"
            >
              +
            </button>
          </div>
          <p className="mt-2 text-sm text-charcoal/70">
            মোট: <strong>{taka(selected.priceTaka * qty)}</strong> (ডেলিভারি
            চার্জ আলাদা)
          </p>
        </div>
      )}

      {/* The Add to Cart button is connected in the next step. */}
      <button
        type="button"
        disabled
        className="mt-6 w-full cursor-not-allowed rounded-lg bg-craft/60 px-6 py-3 font-semibold text-white md:w-auto"
      >
        কার্টে যোগ করুন (শীঘ্রই)
      </button>

      {/* Pricing transparency. Shown ONLY if the server sent cost data. */}
      {cost && (
        <div className="mt-8 rounded-xl border border-craft/30 bg-white p-5">
          <h3 className="font-semibold text-forest">
            এই দাম কীভাবে ঠিক হয়েছে ({selected.label})
          </h3>

          {cost.isSample && (
            <p className="mt-2 rounded bg-yellow-100 px-3 py-2 text-xs text-yellow-800">
              নমুনা সংখ্যা। এটি আসল ব্যবসায়িক তথ্য নয়।
            </p>
          )}

          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>কাঁচা শুটকির ক্রয়মূল্য</dt>
              <dd>{taka(cost.raw)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>প্যাকেজিং খরচ</dt>
              <dd>{taka(cost.packaging)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>অন্যান্য পরিচালন খরচ</dt>
              <dd>{taka(cost.other)}</dd>
            </div>
            <div className="flex justify-between border-t border-craft/30 pt-2 font-medium">
              <dt>মোট তালিকাভুক্ত খরচ</dt>
              <dd>{taka(totalCost)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>বিক্রয়মূল্য</dt>
              <dd>{taka(selected.priceTaka)}</dd>
            </div>
            <div className="flex justify-between font-semibold text-forest">
              <dt>আনুমানিক অবশিষ্ট</dt>
              <dd>{taka(remaining)}</dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-charcoal/70">
            এটি নিট মুনাফা নয়। ডেলিভারি চার্জ এবং এখানে উল্লেখ নেই এমন অন্যান্য
            খরচ ধরা হয়নি।
          </p>
        </div>
      )}
    </div>
  );
}