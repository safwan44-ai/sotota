import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import CheckoutForm from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "চেকআউট | সততা ফুডস",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [zones, activeCoupons] = await Promise.all([
    db.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { chargeTaka: "asc" },
    }),
    db.coupon.count({ where: { isActive: true } }),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <nav className="text-sm text-charcoal/70">
        <Link href="/cart" className="hover:underline">
          কার্ট
        </Link>{" "}
        / <span>চেকআউট</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold text-forest">চেকআউট</h1>

      {zones.length === 0 ? (
        <p className="mt-8 rounded-xl border border-craft/30 bg-white p-6">
          ডেলিভারি এলাকা এখনো ঠিক করা হয়নি, তাই এখন অর্ডার নেওয়া যাচ্ছে না।
        </p>
      ) : (
        <CheckoutForm
          zones={zones.map((z) => ({
            id: z.id,
            name: z.name,
            chargeTaka: z.chargeTaka,
            freeAboveTaka: z.freeAboveTaka,
          }))}
          couponsEnabled={activeCoupons > 0}
        />
      )}
    </main>
  );
}