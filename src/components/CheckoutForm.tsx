"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCartLines, type CartResult } from "@/actions/cart";
import { placeOrder, quoteOrder, type QuoteResult } from "@/actions/order";
import { clearCart, useCartItems, useHydrated } from "@/lib/cart-store";
import { taka } from "@/lib/format";

type Zone = {
  id: string;
  name: string;
  chargeTaka: number;
  freeAboveTaka: number | null;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-craft/40 bg-white px-3 py-2.5 text-charcoal outline-none focus:border-forest focus:ring-1 focus:ring-forest";

function FieldError({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="mt-1 text-sm text-red-700">{text}</p>;
}

export default function CheckoutForm({
  zones,
  couponsEnabled,
}: {
  zones: Zone[];
  couponsEnabled: boolean;
}) {
  const router = useRouter();
  const items = useCartItems();
  const hydrated = useHydrated();

  const [cart, setCart] = useState<CartResult | null>(null);
  const [cartFailed, setCartFailed] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [website, setWebsite] = useState(""); // hidden trap field for bots

  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [applying, setApplying] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Real names, prices and stock for the cart come from the server.
  useEffect(() => {
    if (!hydrated || items.length === 0 || done) return;

    let cancelled = false;
    getCartLines(items)
      .then((res) => {
        if (cancelled) return;
        setCart(res);
        setCartFailed(false);
      })
      .catch(() => {
        if (!cancelled) setCartFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, items, done]);

  // The server works out delivery, discount and the final total.
  const requestKey = zoneId ? JSON.stringify([items, zoneId, applied]) : "";
  const [quote, setQuote] = useState<{ key: string; result: QuoteResult } | null>(null);

  useEffect(() => {
    if (!hydrated || !requestKey || items.length === 0 || done) return;

    let cancelled = false;
    quoteOrder({ items, zoneId, couponCode: applied })
      .then((result) => {
        if (!cancelled) setQuote({ key: requestKey, result });
      })
      .catch(() => {
        if (cancelled) return;
        setQuote({
          key: requestKey,
          result: {
            ok: false,
            error: "হিসাব আনা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।",
          },
        });
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, requestKey, items, zoneId, applied, done]);

  const current = quote && quote.key === requestKey ? quote.result : null;
  const q = current && current.ok ? current : null;
  const qError = current && !current.ok ? current : null;

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    if (!zoneId) {
      setCouponMsg({ ok: false, text: "আগে ডেলিভারি এলাকা বেছে নিন।" });
      return;
    }

    setApplying(true);
    try {
      const res = await quoteOrder({ items, zoneId, couponCode: code });
      if (res.ok) {
        setApplied(res.couponCode);
        setCouponInput("");
        setCouponMsg({ ok: true, text: "কুপন প্রয়োগ হয়েছে।" });
      } else {
        setCouponMsg({ ok: false, text: res.error });
      }
    } catch {
      setCouponMsg({ ok: false, text: "কুপন যাচাই করা যায়নি। আবার চেষ্টা করুন।" });
    } finally {
      setApplying(false);
    }
  }

  function removeCoupon() {
    setApplied(null);
    setCouponMsg(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || done) return;

    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const result = await placeOrder({
        items,
        zoneId,
        couponCode: applied,
        name,
        phone,
        address,
        note,
        website,
      });

      if (result.ok) {
        setDone(true);
        clearCart();
        router.push(
          `/order-confirmation/${encodeURIComponent(result.orderNo)}?t=${encodeURIComponent(result.token)}`
        );
        return;
      }

      setFormError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
    } catch {
      setFormError(
        "সংযোগে সমস্যা হয়েছে। অর্ডারটি হয়েছে কিনা নিশ্চিত না হলে আবার অর্ডার করার আগে আমাদের জানান।"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return <p className="mt-8 text-charcoal/70">লোড হচ্ছে…</p>;
  }

  if (done) {
    return (
      <p className="mt-8 rounded-xl border border-craft/30 bg-white p-6 text-forest">
        আপনার অর্ডার জমা হয়েছে। একটু অপেক্ষা করুন…
      </p>
    );
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

  if (cartFailed && !cart) {
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

  const lines = cart
    ? cart.lines.filter((l) => items.some((i) => i.variantId === l.variantId))
    : [];
  const hasIssue = lines.some((l) => l.status !== "ok");
  const productsTotal = lines.reduce((sum, l) => sum + l.lineTotalTaka, 0);
  const canSubmit =
    !!zoneId && !!q && cart !== null && !hasIssue && !submitting;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]"
    >
      {/* ------------------------------------------------ Customer details */}
      <div className="space-y-5">
        <div>
          <label htmlFor="name" className="text-sm font-medium">
            আপনার নাম
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <FieldError text={fieldErrors.name} />
        </div>

        <div>
          <label htmlFor="phone" className="text-sm font-medium">
            মোবাইল নম্বর
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            placeholder="যেমন ০১৭XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
          <FieldError text={fieldErrors.phone} />
        </div>

        <div>
          <label htmlFor="zone" className="text-sm font-medium">
            ডেলিভারি এলাকা
          </label>
          <select
            id="zone"
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className={inputClass}
          >
            <option value="">এলাকা বেছে নিন</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} (ডেলিভারি {taka(z.chargeTaka)}
                {z.freeAboveTaka !== null
                  ? `, ${taka(z.freeAboveTaka)} বা বেশি কিনলে ফ্রি`
                  : ""}
                )
              </option>
            ))}
          </select>
          <FieldError text={fieldErrors.zoneId} />
        </div>

        <div>
          <label htmlFor="address" className="text-sm font-medium">
            পুরো ঠিকানা
          </label>
          <textarea
            id="address"
            rows={3}
            autoComplete="street-address"
            maxLength={300}
            placeholder="বাড়ি/রোড, এলাকা, থানা, জেলা"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
          />
          <FieldError text={fieldErrors.address} />
        </div>

        <div>
          <label htmlFor="note" className="text-sm font-medium">
            মন্তব্য (ঐচ্ছিক)
          </label>
          <textarea
            id="note"
            rows={2}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
          />
          <FieldError text={fieldErrors.note} />
        </div>

        {/* Hidden trap for bots. Real people never see or fill this. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
        </div>

        {couponsEnabled && (
          <div>
            <label htmlFor="coupon" className="text-sm font-medium">
              কুপন কোড (ঐচ্ছিক)
            </label>

            {applied ? (
              <p className="mt-1 flex items-center justify-between rounded-lg bg-green-50 px-3 py-2.5 text-forest">
                <span>✓ কুপন {applied} প্রয়োগ হয়েছে</span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-sm text-red-700 hover:underline"
                >
                  সরান
                </button>
              </p>
            ) : (
              <div className="mt-1 flex gap-2">
                <input
                  id="coupon"
                  type="text"
                  autoComplete="off"
                  maxLength={40}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className={inputClass + " mt-0"}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={applying || couponInput.trim() === ""}
                  className="shrink-0 rounded-lg bg-forest px-4 py-2.5 text-white disabled:opacity-50"
                >
                  প্রয়োগ করুন
                </button>
              </div>
            )}

            {couponMsg && (
              <p
                className={
                  "mt-1 text-sm " + (couponMsg.ok ? "text-forest" : "text-red-700")
                }
              >
                {couponMsg.text}
              </p>
            )}
            <FieldError text={fieldErrors.coupon} />
          </div>
        )}
      </div>

      {/* ------------------------------------------------ Summary */}
      <aside className="h-fit rounded-xl border border-craft/30 bg-white p-5">
        <h2 className="text-lg font-semibold text-forest">আপনার অর্ডার</h2>

        {cart === null ? (
          <p className="mt-3 text-sm text-charcoal/70">লোড হচ্ছে…</p>
        ) : (
          <ul className="mt-3 divide-y divide-craft/20 text-sm">
            {lines.map((l) => (
              <li key={l.variantId} className="flex justify-between gap-3 py-2">
                <span>
                  {l.status === "missing"
                    ? "পণ্যটি আর পাওয়া যাচ্ছে না"
                    : `${l.productNameBn} (${l.label}) × ${l.qty.toLocaleString("bn-BD")}`}
                </span>
                {l.status === "ok" && <span>{taka(l.lineTotalTaka)}</span>}
              </li>
            ))}
          </ul>
        )}

        {hasIssue && (
          <p className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900">
            কার্টের কিছু পণ্যে সমস্যা আছে (স্টক কম বা শেষ)।{" "}
            <Link href="/cart" className="font-semibold underline">
              কার্টে গিয়ে ঠিক করুন
            </Link>
          </p>
        )}

        <dl className="mt-4 space-y-2 border-t border-craft/20 pt-4 text-sm">
          <div className="flex justify-between">
            <dt>পণ্যের মোট দাম</dt>
            <dd>{taka(q ? q.subtotalTaka : productsTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>ডেলিভারি চার্জ</dt>
            <dd>
              {q
                ? q.deliveryChargeTaka === 0
                  ? "ফ্রি"
                  : taka(q.deliveryChargeTaka)
                : zoneId
                  ? "হিসাব হচ্ছে…"
                  : "এলাকা বেছে নিন"}
            </dd>
          </div>
          {q && q.discountTaka > 0 && (
            <div className="flex justify-between text-forest">
              <dt>কুপন ছাড়</dt>
              <dd>−{taka(q.discountTaka)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-craft/20 pt-2 text-base font-bold text-forest">
            <dt>সর্বমোট</dt>
            <dd>{q ? taka(q.totalTaka) : "—"}</dd>
          </div>
        </dl>

        {qError && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            <p>{qError.error}</p>
            {qError.field === "coupon" && applied && (
              <button
                type="button"
                onClick={removeCoupon}
                className="mt-1 font-semibold underline"
              >
                কুপন সরান
              </button>
            )}
          </div>
        )}

        <p className="mt-4 text-sm text-charcoal/80">
          পেমেন্ট: <strong>ক্যাশ অন ডেলিভারি</strong> (পণ্য হাতে পেয়ে টাকা দিন)
        </p>

        {formError && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-4 w-full rounded-lg bg-forest px-6 py-3 font-semibold text-white hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "অর্ডার হচ্ছে…" : "অর্ডার নিশ্চিত করুন"}
        </button>

        <p className="mt-3 text-xs text-charcoal/70">
          অর্ডার করলে আপনি আমাদের{" "}
          <Link href="/terms" className="underline">
            শর্তাবলি
          </Link>{" "}
          ও{" "}
          <Link href="/privacy-policy" className="underline">
            গোপনীয়তা নীতি
          </Link>{" "}
          মেনে নিচ্ছেন।
        </p>
      </aside>
    </form>
  );
}