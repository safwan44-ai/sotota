import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { taka } from "@/lib/format";
import { statusLabel } from "@/lib/order-status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "অর্ডার নিশ্চিত | সততা",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ orderNo: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function sameToken(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: Props) {
  const { orderNo } = await params;
  const { t } = await searchParams;

  // The secret token in the link is the key. Without it, nothing is shown.
  if (typeof t !== "string" || t.length === 0 || t.length > 100) notFound();
  if (orderNo.length === 0 || orderNo.length > 40) notFound();

  const order = await db.order.findUnique({
    where: { orderNo },
    include: { items: true, deliveryZone: true },
  });

  if (!order || !sameToken(order.trackingToken, t)) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-forest/30 bg-green-50 p-6 text-center">
        <p className="text-3xl">✓</p>
        <h1 className="mt-2 text-2xl font-bold text-forest">
          আপনার অর্ডার পেয়েছি
        </h1>
        <p className="mt-3 text-sm text-charcoal/80">আপনার অর্ডার নম্বর</p>
        <p className="mt-1 text-2xl font-bold tracking-wide text-forest">
          {order.orderNo}
        </p>
        <p className="mt-3 text-sm text-charcoal/80">
          এই নম্বরটি সংরক্ষণ করে রাখুন। অবস্থা:{" "}
          <strong>{statusLabel(order.status)}</strong>
        </p>
      </div>

      <section className="mt-6 rounded-xl border border-craft/30 bg-white p-5">
        <h2 className="text-lg font-semibold text-forest">অর্ডারের বিবরণ</h2>
        <ul className="mt-3 divide-y divide-craft/20 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-2">
              <span>
                {item.productNameBn} ({item.variantLabel}) ×{" "}
                {item.quantity.toLocaleString("bn-BD")}
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
          পেমেন্ট: <strong>ক্যাশ অন ডেলিভারি</strong> (পণ্য হাতে পেয়ে টাকা দিন)
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-craft/30 bg-white p-5 text-sm">
        <h2 className="text-lg font-semibold text-forest">ডেলিভারির তথ্য</h2>
        <dl className="mt-3 space-y-2">
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-charcoal/70">নাম</dt>
            <dd>{order.customerName}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-charcoal/70">ফোন</dt>
            <dd>{order.phone}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-charcoal/70">ঠিকানা</dt>
            <dd className="break-words">{order.address}</dd>
          </div>
          {order.deliveryZone && (
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-charcoal/70">এলাকা</dt>
              <dd>{order.deliveryZone.name}</dd>
            </div>
          )}
          {order.note && (
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-charcoal/70">মন্তব্য</dt>
              <dd className="break-words">{order.note}</dd>
            </div>
          )}
        </dl>
      </section>

      <p className="mt-6 text-xs text-charcoal/70">
        এই পাতার লিংকটি অন্য কাউকে দেবেন না, এতে আপনার ঠিকানা ও ফোন নম্বর আছে।
      </p>

      <div className="mt-6">
        <Link
          href="/shop"
          className="inline-block rounded-lg bg-forest px-6 py-3 font-semibold text-white"
        >
          আরও কেনাকাটা করুন
        </Link>
      </div>
    </main>
  );
}