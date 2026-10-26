import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Check again here, close to the data (layouts do not re-run on every click).
  const admin = await requireAdmin();

  const [pendingOrders, totalOrders, totalProducts] = await Promise.all([
    db.order.count({ where: { status: "PENDING" } }),
    db.order.count(),
    db.product.count(),
  ]);

  const cards = [
    {
      label: "নতুন (অপেক্ষমাণ) অর্ডার",
      value: pendingOrders,
      href: "/admin/orders?status=PENDING",
    },
    { label: "মোট অর্ডার", value: totalOrders, href: "/admin/orders" },
    { label: "মোট পণ্য", value: totalProducts, href: null },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">
        স্বাগতম, {admin.name}
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => {
          const body = (
            <>
              <p className="text-sm text-charcoal/70">{c.label}</p>
              <p className="mt-2 text-3xl font-bold text-forest">
                {c.value.toLocaleString("bn-BD")}
              </p>
            </>
          );
          return c.href ? (
            <Link
              key={c.label}
              href={c.href}
              className="rounded-xl border border-craft/30 bg-white p-5 hover:border-forest"
            >
              {body}
            </Link>
          ) : (
            <div
              key={c.label}
              className="rounded-xl border border-craft/30 bg-white p-5"
            >
              {body}
            </div>
          );
        })}
      </div>

      <p className="mt-8 rounded-xl border border-craft/30 bg-white p-5 text-sm text-charcoal/80">
        পণ্য, স্টক ও ক্যাটাগরি সম্পাদনা পরের ধাপে যোগ হবে।
      </p>
    </div>
  );
}