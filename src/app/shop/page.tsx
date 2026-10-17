import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await db.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      variants: { where: { isActive: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-forest">সব পণ্য</h1>
      <p className="mt-2 text-charcoal/70">আমাদের শুটকির তালিকা</p>

      {products.length === 0 ? (
        <p className="mt-10 rounded-lg border border-craft/30 bg-white p-6 text-center">
          এখনো কোনো পণ্য যোগ করা হয়নি।
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => {
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