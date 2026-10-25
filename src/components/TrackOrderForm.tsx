"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { trackOrder } from "@/actions/track";
import type { TrackedOrder } from "@/lib/tracking";
import { taka } from "@/lib/format";
import { statusLabel } from "@/lib/order-status";
import { formatDateTime } from "@/lib/dates";

const inputClass =
  "mt-1 w-full rounded-lg border border-craft/40 bg-white px-3 py-2.5 text-charcoal outline-none focus:border-forest focus:ring-1 focus:ring-forest";

export default function TrackOrderForm() {
  const [orderNo, setOrderNo] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await trackOrder({ orderNo, phone });
      if (res.ok) setOrder(res.order);
      else setError(res.error);
    } catch {
      setError("সংযোগে সমস্যা হয়েছে। ইন্টারনেট দেখে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 space-y-4 rounded-xl border border-craft/30 bg-white p-5"
      >
        <div>
          <label htmlFor="orderNo" className="text-sm font-medium">
            অর্ডার নম্বর
          </label>
          <input
            id="orderNo"
            type="text"
            autoComplete="off"
            maxLength={40}
            placeholder="যেমন SOT261018-48213"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="trackPhone" className="text-sm font-medium">
            অর্ডারের সময় দেওয়া মোবাইল নম্বর
          </label>
          <input
            id="trackPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            placeholder="যেমন ০১৭XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={loading || orderNo.trim() === "" || phone.trim() === ""}
          className="w-full rounded-lg bg-forest px-6 py-3 font-semibold text-white hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {loading ? "খোঁজা হচ্ছে…" : "অর্ডার দেখুন"}
        </button>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </form>

      {order && (
        <section className="mt-6 space-y-6" aria-live="polite">
          <div className="rounded-2xl border border-forest/30 bg-green-50 p-5 text-center">
            <p className="text-sm text-charcoal/80">অর্ডার নম্বর</p>
            <p className="mt-1 text-xl font-bold tracking-wide text-forest">
              {order.orderNo}
            </p>
            <p className="mt-3 text-sm text-charcoal/80">বর্তমান অবস্থা</p>
            <p
              className={
                "mt-1 text-2xl font-bold " +
                (order.status === "CANCELLED" ? "text-red-700" : "text-forest")
              }
            >
              {statusLabel(order.status)}
            </p>
          </div>

          <div className="rounded-xl border border-craft/30 bg-white p-5">
            <h2 className="text-lg font-semibold text-forest">অবস্থার ইতিহাস</h2>
            <ol className="mt-3 space-y-3">
              {order.history.map((h, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span
                    className={
                      "mt-1 h-3 w-3 shrink-0 rounded-full " +
                      (h.status === "CANCELLED" ? "bg-red-600" : "bg-forest")
                    }
                  />
                  <span>
                    <strong>{statusLabel(h.status)}</strong>
                    <br />
                    <span className="text-charcoal/70">{formatDateTime(h.at)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-craft/30 bg-white p-5">
            <h2 className="text-lg font-semibold text-forest">অর্ডারের বিবরণ</h2>
            <ul className="mt-3 divide-y divide-craft/20 text-sm">
              {order.items.map((item, i) => (
                <li key={i} className="flex justify-between gap-3 py-2">
                  <span>
                    {item.name} ({item.label}) ×{" "}
                    {item.qty.toLocaleString("bn-BD")}
                  </span>
                  <span>{taka(item.lineTotalTaka)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-craft/20 pt-4 text-sm">
              <div className="flex justify-between">
                <dt>পণ্যের মোট দাম</dt>
                <dd>{taka(order.subtotalTaka)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>ডেলিভারি চার্জ</dt>
                <dd>
                  {order.deliveryChargeTaka === 0
                    ? "ফ্রি"
                    : taka(order.deliveryChargeTaka)}
                </dd>
              </div>
              {order.discountTaka > 0 && (
                <div className="flex justify-between text-forest">
                  <dt>কুপন ছাড়</dt>
                  <dd>−{taka(order.discountTaka)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-craft/20 pt-2 text-base font-bold text-forest">
                <dt>সর্বমোট</dt>
                <dd>{taka(order.totalTaka)}</dd>
              </div>
            </dl>

            <p className="mt-4 text-sm">
              পেমেন্ট: <strong>ক্যাশ অন ডেলিভারি</strong>
              {order.zoneName ? ` · এলাকা: ${order.zoneName}` : ""}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}