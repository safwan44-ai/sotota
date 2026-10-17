import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [categories, featured, reviews] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.product.findMany({
      where: { isActive: true, isFeatured: true },
      include: { category: true, variants: { where: { isActive: true } } },
      orderBy: { createdAt: "asc" },
      take: 4,
    }),
    // Only reviews the admin has approved are ever shown.
    db.review.findMany({
      where: { isApproved: true },
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  return (
    <main>
      {/* ---------- Hero ---------- */}
      <section>
        {/* Phone */}
        <div className="md:hidden">
          <div className="relative aspect-[16/10] w-full">
            <Image
              src="/images/hero-mobile.jpg"
              alt="শুকনো মাছ (শুটকি)"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
          <div className="bg-forest px-4 pb-10 pt-2 text-white">
            <h1 className="text-3xl font-bold">সততার সাথে শুটকি</h1>
            <p className="mt-3 text-white/85">
              অনলাইনে শুটকি মাছ কিনুন। পণ্যের ওজন, দাম ও তথ্য স্পষ্টভাবে জানুন।
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-block rounded-lg bg-craft px-6 py-3 font-semibold text-white"
            >
              পণ্য দেখুন
            </Link>
          </div>
        </div>

        {/* Computer */}
        <div className="relative hidden h-[440px] md:block">
          <Image
            src="/images/hero.jpg"
            alt="শুকনো মাছ (শুটকি)"
            fill
            priority
            sizes="100vw"
            className="object-cover object-right"
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(20,65,43,0.92), rgba(20,65,43,0.55) 45%, rgba(20,65,43,0))",
            }}
          />
          <div className="relative mx-auto flex h-full max-w-6xl items-center px-4">
            <div className="max-w-md text-white">
              <h1 className="text-4xl font-bold">সততার সাথে শুটকি</h1>
              <p className="mt-4 text-lg text-white/85">
                অনলাইনে শুটকি মাছ কিনুন। পণ্যের ওজন, দাম ও তথ্য স্পষ্টভাবে জানুন।
              </p>
              <Link
                href="/shop"
                className="mt-6 inline-block rounded-lg bg-craft px-6 py-3 font-semibold text-white"
              >
                পণ্য দেখুন
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Categories ---------- */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-12">
          <h2 className="text-2xl font-bold text-forest">ক্যাটাগরি</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="rounded-full border border-craft/40 bg-white px-4 py-2 text-sm text-forest hover:border-forest"
              >
                {c.nameBn}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Featured products ---------- */}
      <section className="mx-auto max-w-6xl px-4 pt-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold text-forest">বাছাই করা পণ্য</h2>
          <Link href="/shop" className="text-sm text-craft hover:underline">
            সব পণ্য দেখুন
          </Link>
        </div>

        {featured.length === 0 ? (
          <p className="mt-6 rounded-lg border border-craft/30 bg-white p-6 text-center">
            এখনো কোনো পণ্য যোগ করা হয়নি।
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map((p) => {
              const prices = p.variants.map((v) => v.priceTaka);
              return (
                <ProductCard
                  key={p.id}
                  slug={p.slug}
                  nameBn={p.nameBn}
                  categoryName={p.category.nameBn}
                  isSample={p.isSample}
                  minPrice={prices.length ? Math.min(...prices) : null}
                  inStock={p.variants.some((v) => v.stock > 0)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- Benefits ---------- */}
      {/* Edit these so they only say what is really true for your business. */}
      <section className="mx-auto max-w-6xl px-4 pt-12">
        <h2 className="text-2xl font-bold text-forest">কেন সততা থেকে কিনবেন</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-craft/30 bg-white p-5">
            <h3 className="font-semibold text-forest">ক্যাশ অন ডেলিভারি</h3>
            <p className="mt-2 text-sm text-charcoal/80">
              পণ্য হাতে পেয়ে টাকা দিন।
            </p>
          </div>
          <div className="rounded-xl border border-craft/30 bg-white p-5">
            <h3 className="font-semibold text-forest">স্পষ্ট তথ্য</h3>
            <p className="mt-2 text-sm text-charcoal/80">
              প্রতিটি পণ্যের ওজন, দাম ও সংরক্ষণের নিয়ম জানা যাবে।
            </p>
          </div>
          <div className="rounded-xl border border-craft/30 bg-white p-5">
            <h3 className="font-semibold text-forest">অর্ডারের অবস্থা জানুন</h3>
            <p className="mt-2 text-sm text-charcoal/80">
              অর্ডার নম্বর দিয়ে আপনার অর্ডার কোথায় আছে দেখুন।
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Pricing transparency ---------- */}
      <section className="mx-auto max-w-6xl px-4 pt-12">
        <div className="rounded-2xl border border-craft/30 bg-white p-6 md:p-8">
          <h2 className="text-2xl font-bold text-forest">দাম নিয়ে স্বচ্ছতা</h2>
          <p className="mt-3 max-w-3xl text-charcoal/80">
            আমরা চাই আপনি জানুন দাম কীভাবে ঠিক হয়: কাঁচা শুটকির ক্রয়মূল্য,
            প্যাকেজিং ও অন্যান্য খরচ। যেসব পণ্যের খরচের বিবরণ প্রকাশ করা হয়েছে,
            সেসব পণ্যের পাতায় তা দেখতে পাবেন। ডেলিভারি চার্জ আলাদা।
          </p>
        </div>
      </section>

      {/* ---------- Reviews (only real, approved ones) ---------- */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-12">
          <h2 className="text-2xl font-bold text-forest">ক্রেতাদের মতামত</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <figure
                key={r.id}
                className="rounded-xl border border-craft/30 bg-white p-5"
              >
                <p className="text-craft">{"★".repeat(r.rating)}</p>
                <blockquote className="mt-2 text-sm">{r.comment}</blockquote>
                <figcaption className="mt-3 text-xs text-charcoal/70">
                  {r.authorName} · {r.product.nameBn}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}