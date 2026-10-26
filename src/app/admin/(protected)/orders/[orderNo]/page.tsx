import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { formatDateTime } from "@/lib/dates";
import { taka } from "@/lib/format";
import {
  allowedNextStatuses,
  statusBadgeClass,
  statusLabel,
} from "@/lib/order-status";
import { looksLikeOrderNo } from "@/lib/tracking";
import StatusForm from "@/components/StatusForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orderNo: string }> };

export default async function AdminOrderPage({ params }: Props) {
  await requireAdmin();

  const { orderNo } = await params;
  if (!looksLikeOrderNo(orderNo)) notFound();

  const order = await db.order.findUnique({
    where: { orderNo },
    include: {
      items: true,
      deliveryZone: true,
      coupon: { select: { code: true } },
      history: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const next = allowedNextStatuses(order.status);

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-charcoal/70 hover:underline">
        ← সব অর্ডার
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-forest">{order.orderNo}</h1>
        <span
          className={
            "rounded-full px-3 py-1 text-sm font-medium " +
            statusBadgeClass(order.status)
          }
        >
          {statusLabel(order.status)}
        </span>
      </div>
      <p className="mt-1 text-sm text-charcoal/70">
        অর্ডার করা হয়েছে: {formatDateTime(order.createdAt.toISOString())}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Items and money */}
          <section className="rounded-xl border border-craft/30 bg-white p-5">
            <h2 className="text-lg font-semibold text-forest">পণ্য</h2>
            <ul className="mt-3 divide-y divide-craft/20 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {item.productNameBn} ({item.variantLabel}) ×{" "}
                    {item.quantity.toLocaleString("bn-BD")}
                    <span className="text-charcoal/60">
                      {" "}
                      · প্রতিটি {taka(item.unitPriceTaka)}
                    </span>
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
                  <dt>কুপন ছাড়{order.coupon ? ` (${order.coupon.code})` : ""}</dt>
                  <dd>−{taka(order.discountTaka)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-craft/20 pt-2 text-base font-bold text-forest">
                <dt>সর্বমোট (ক্যাশ অন ডেলিভারি)</dt>
                <dd>{taka(order.totalTaka)}</dd>
              </div>
            </dl>
          </section>

          {/* Customer (only here, only what delivery needs) */}
          <section className="rounded-xl border border-craft/30 bg-white p-5 text-sm">
            <h2 className="text-lg font-semibold text-forest">ডেলিভারির তথ্য</h2>
            <dl className="mt-3 space-y-2">
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-charcoal/70">নাম</dt>
                <dd>{order.customerName}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-charcoal/70">ফোন</dt>
                <dd>
                  <a href={`tel:${order.phone}`} className="text-forest hover:underline">
                    {order.phone}
                  </a>
                </dd>
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
                  <dt className="w-24 shrink-0 text-charcoal/70">ক্রেতার মন্তব্য</dt>
                  <dd className="break-words">{order.note}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>

        <div className="space-y-6">
          {/* Change status */}
          <section className="rounded-xl border border-craft/30 bg-white p-5">
            <h2 className="text-lg font-semibold text-forest">অবস্থা বদলান</h2>
            {next.length === 0 ? (
              <p className="mt-3 text-sm text-charcoal/70">
                এই অর্ডারের অবস্থা চূড়ান্ত, আর বদলানো যাবে না।
              </p>
            ) : (
              <div className="mt-3">
                <StatusForm
                  key={order.status}
                  orderNo={order.orderNo}
                  options={next.map((s) => ({ value: s, label: statusLabel(s) }))}
                />
              </div>
            )}
          </section>

          {/* History */}
          <section className="rounded-xl border border-craft/30 bg-white p-5">
            <h2 className="text-lg font-semibold text-forest">অবস্থার ইতিহাস</h2>
            <ol className="mt-3 space-y-3 text-sm">
              {order.history.map((h) => (
                <li key={h.id} className="flex items-start gap-3">
                  <span
                    className={
                      "mt-1 h-3 w-3 shrink-0 rounded-full " +
                      (h.status === "CANCELLED" ? "bg-red-600" : "bg-forest")
                    }
                  />
                  <span>
                    <strong>{statusLabel(h.status)}</strong>
                    <br />
                    <span className="text-charcoal/70">
                      {formatDateTime(h.createdAt.toISOString())}
                      {h.changedBy ? ` · ${h.changedBy}` : ""}
                    </span>
                    {h.note && (
                      <>
                        <br />
                        <span className="text-charcoal/80">নোট: {h.note}</span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}