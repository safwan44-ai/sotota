import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.category.findUnique({ where: { slug } });
  return {
    title: category ? `${category.nameBn} | সততা` : "পাতা পাওয়া যায়নি | সততা",
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  const category = await db.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: { isActive: true },
        include: { category: true, variants: { where: { isActive: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!category || !category.isActive) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <nav className="text-sm text-charcoal/70">
        <Link href="/" className="hover:underline">
          হোম
        </Link>{" "}
        /{" "}
        <Link href="/shop" className="hover:underline">
          দোকান
        </Link>{" "}
        / <span>{category.nameBn}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold text-forest">{category.nameBn}</h1>

      {category.products.length === 0 ? (
        <p className="mt-8 rounded-lg border border-craft/30 bg-white p-6 text-center">
          এই ক্যাটাগরিতে এখনো কোনো পণ্য নেই।
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {category.products.map((p) => {
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
    </main>
  );
}