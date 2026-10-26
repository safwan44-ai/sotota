import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { formatDateTime } from "@/lib/dates";
import { taka } from "@/lib/format";
import {
  ORDER_STATUSES,
  isOrderStatus,
  statusBadgeClass,
  statusLabel,
} from "@/lib/order-status";
import { normalizePhone } from "@/lib/validators";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function text(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function listHref(p: { status?: string | null; q?: string; page?: number }) {
  const params = new URLSearchParams();
  if (p.status) params.set("status", p.status);
  if (p.q) params.set("q", p.q);
  if (p.page && p.page > 1) params.set("page", String(p.page));
  const s = params.toString();
  return s ? `/admin/orders?${s}` : "/admin/orders";
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  await requireAdmin();

  const sp = await searchParams;
  const statusParam = text(sp.status);
  const status = isOrderStatus(statusParam) ? statusParam : null;
  const q = text(sp.q).trim().slice(0, 40);
  const page = Math.min(500, Math.max(1, parseInt(text(sp.page), 10) || 1));

  const phoneQuery = normalizePhone(q);
  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { orderNo: { contains: q.toUpperCase() } },
            { customerName: { contains: q, mode: "insensitive" as const } },
            ...(phoneQuery ? [{ phone: { contains: phoneQuery } }] : []),
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        orderNo: true,
        createdAt: true,
        customerName: true,
        totalTaka: true,
        status: true,
        items: { select: { quantity: true } },
      },
    }),
    db.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">অর্ডার</h1>

      {/* Search */}
      <form action="/admin/orders" method="get" className="mt-4 flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          maxLength={40}
          placeholder="অর্ডার নম্বর, নাম বা ফোন"
          className="w-full max-w-sm rounded-lg border border-craft/40 bg-white px-3 py-2 outline-none focus:border-forest"
        />
        <button
          type="submit"
          className="rounded-lg bg-forest px-4 py-2 text-white hover:bg-forest/90"
        >
          খুঁজুন
        </button>
      </form>

      {/* Status tabs */}
      <nav className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link
          href={listHref({ q })}
          className={
            "rounded-full border px-3 py-1 " +
            (!status ? "border-forest bg-forest text-white" : "border-craft/40 bg-white")
          }
        >
          সব
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={listHref({ status: s, q })}
            className={
              "rounded-full border px-3 py-1 " +
              (status === s ? "border-forest bg-forest text-white" : "border-craft/40 bg-white")
            }
          >
            {statusLabel(s)}
          </Link>
        ))}
      </nav>

      <p className="mt-4 text-sm text-charcoal/70">
        মোট {total.toLocaleString("bn-BD")} টি অর্ডার
      </p>

      {orders.length === 0 ? (
        <p className="mt-4 rounded-xl border border-craft/30 bg-white p-6 text-center">
          কোনো অর্ডার পাওয়া যায়নি।
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-craft/30 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-craft/30 bg-craft/10 text-charcoal/80">
              <tr>
                <th className="px-4 py-3 font-medium">অর্ডার নম্বর</th>
                <th className="px-4 py-3 font-medium">তারিখ</th>
                <th className="px-4 py-3 font-medium">নাম</th>
                <th className="px-4 py-3 font-medium">পণ্য</th>
                <th className="px-4 py-3 font-medium">মোট</th>
                <th className="px-4 py-3 font-medium">অবস্থা</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-craft/20">
              {orders.map((o) => (
                <tr key={o.orderNo}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${o.orderNo}`}
                      className="font-semibold text-forest hover:underline"
                    >
                      {o.orderNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatDateTime(o.createdAt.toISOString())}</td>
                  <td className="px-4 py-3">{o.customerName}</td>
                  <td className="px-4 py-3">
                    {o.items
                      .reduce((sum, i) => sum + i.quantity, 0)
                      .toLocaleString("bn-BD")}{" "}
                    টি
                  </td>
                  <td className="px-4 py-3">{taka(o.totalTaka)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2.5 py-1 text-xs font-medium " +
                        statusBadgeClass(o.status)
                      }
                    >
                      {statusLabel(o.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={listHref({ status, q, page: page - 1 })}
              className="rounded-lg border border-craft/40 bg-white px-4 py-2"
            >
              ← আগের পাতা
            </Link>
          ) : (
            <span />
          )}
          <span>
            পাতা {page.toLocaleString("bn-BD")} / {totalPages.toLocaleString("bn-BD")}
          </span>
          {page < totalPages ? (
            <Link
              href={listHref({ status, q, page: page + 1 })}
              className="rounded-lg border border-craft/40 bg-white px-4 py-2"
            >
              পরের পাতা →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}