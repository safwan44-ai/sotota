import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductPurchase from "@/components/ProductPurchase";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug } });

  if (!product || !product.isActive) {
    return { title: "পণ্য পাওয়া যায়নি | সততা" };
  }

  return {
    title: `${product.nameBn} | সততা`,
    description: product.descriptionBn ?? undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        orderBy: { weightGram: "asc" },
        include: { cost: true },
      },
    },
  });

  if (!product || !product.isActive) notFound();

  // Cost breakdown is public only if ALL of these are switched on:
  // the global setting, this product's switch, and this weight's switch.
  const globalSetting = await db.siteSetting.findUnique({
    where: { key: "showCostBreakdownPublic" },
  });
  const costAllowed = globalSetting?.value === "true" && product.showCostPublic;

  // We build a clean list for the browser. Private cost numbers
  // are NOT included unless the owner allowed them.
  const variants = product.variants.map((v) => ({
    id: v.id,
    label: v.label,
    priceTaka: v.priceTaka,
    inStock: v.stock > 0,
    maxQty: Math.min(v.stock, 10),
    cost:
      costAllowed && v.cost?.isPublic
        ? {
            raw: v.cost.rawCostTaka,
            packaging: v.cost.packagingCostTaka,
            other: v.cost.otherCostTaka,
            isSample: v.cost.isSample,
          }
        : null,
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-sm text-charcoal/70">
        <Link href="/" className="hover:underline">
          হোম
        </Link>{" "}
        /{" "}
        <Link href="/shop" className="hover:underline">
          দোকান
        </Link>{" "}
        / <span>{product.nameBn}</span>
      </nav>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        {/* Photo (real photos are added later) */}
        <div className="flex aspect-square items-center justify-center rounded-2xl border border-craft/30 bg-craft/10 text-craft">
          ছবি যোগ হবে
        </div>

        {/* Details */}
        <div>
          <p className="text-sm text-craft">{product.category.nameBn}</p>
          <h1 className="mt-1 text-3xl font-bold text-forest">
            {product.nameBn}
          </h1>
          {product.nameEn && (
            <p className="text-charcoal/70">{product.nameEn}</p>
          )}
          {product.isSample && (
            <span className="mt-2 inline-block rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
              নমুনা (SAMPLE)
            </span>
          )}

          {product.descriptionBn && (
            <p className="mt-4 text-charcoal/90">{product.descriptionBn}</p>
          )}

          {variants.length > 0 ? (
            <ProductPurchase variants={variants} />
          ) : (
            <p className="mt-6 rounded-lg border border-craft/30 bg-white p-4">
              এই পণ্যের দাম শীঘ্রই জানানো হবে।
            </p>
          )}

          {/* Only shown when the owner has filled them in */}
          <div className="mt-8 space-y-4 text-sm">
            {product.storageInfo && (
              <section>
                <h2 className="font-semibold text-forest">সংরক্ষণের নিয়ম</h2>
                <p className="mt-1">{product.storageInfo}</p>
              </section>
            )}
            {product.packagingInfo && (
              <section>
                <h2 className="font-semibold text-forest">প্যাকেজিং</h2>
                <p className="mt-1">{product.packagingInfo}</p>
              </section>
            )}
            {product.originInfo && (
              <section>
                <h2 className="font-semibold text-forest">উৎস</h2>
                <p className="mt-1">{product.originInfo}</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}