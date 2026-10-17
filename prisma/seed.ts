import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ALL VALUES HERE ARE SAMPLE DATA FOR DEVELOPMENT ONLY.
// Replace prices, costs and descriptions with real data before launch.

const categories = [
  { slug: "loitta-shutki", nameBn: "লইট্টা শুটকি", nameEn: "Loitta Shutki", sortOrder: 1 },
  { slug: "chingri-shutki", nameBn: "চিংড়ি শুটকি", nameEn: "Chingri Shutki", sortOrder: 2 },
  { slug: "churi-shutki", nameBn: "ছুরি শুটকি", nameEn: "Churi Shutki", sortOrder: 3 },
  { slug: "kachki-shutki", nameBn: "কাচকি শুটকি", nameEn: "Kachki Shutki", sortOrder: 4 },
  { slug: "bombay-shutki", nameBn: "বোম্বে শুটকি", nameEn: "Bombay Shutki", sortOrder: 5 },
  { slug: "other-dried-fish", nameBn: "অন্যান্য শুটকি", nameEn: "Other Dried Fish", sortOrder: 6 },
];

const products = [
  { slug: "loitta-shutki", categorySlug: "loitta-shutki", nameBn: "লইট্টা শুটকি", nameEn: "Loitta Shutki", pricePerKg: 1200, featured: true },
  { slug: "chingri-shutki", categorySlug: "chingri-shutki", nameBn: "চিংড়ি শুটকি", nameEn: "Chingri Shutki", pricePerKg: 1800, featured: true },
  { slug: "churi-shutki", categorySlug: "churi-shutki", nameBn: "ছুরি শুটকি", nameEn: "Churi Shutki", pricePerKg: 1500, featured: true },
  { slug: "kachki-shutki", categorySlug: "kachki-shutki", nameBn: "কাচকি শুটকি", nameEn: "Kachki Shutki", pricePerKg: 1000, featured: false },
  { slug: "bombay-shutki", categorySlug: "bombay-shutki", nameBn: "বোম্বে শুটকি", nameEn: "Bombay Shutki", pricePerKg: 900, featured: false },
];

const weights = [
  { gram: 250, label: "250g", pack: 15, other: 10 },
  { gram: 500, label: "500g", pack: 20, other: 15 },
  { gram: 1000, label: "1kg", pack: 30, other: 25 },
];

async function main() {
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }

  for (const p of products) {
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: p.categorySlug },
    });

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        nameBn: p.nameBn,
        nameEn: p.nameEn,
        descriptionBn: "নমুনা বিবরণ। আসল তথ্য দিয়ে বদলাতে হবে।",
        isSample: true,
        isFeatured: p.featured,
        categoryId: category.id,
      },
    });

    for (const w of weights) {
      const price = Math.round((p.pricePerKg * w.gram) / 1000);

      const variant = await prisma.productVariant.upsert({
        where: {
          productId_weightGram: { productId: product.id, weightGram: w.gram },
        },
        update: {},
        create: {
          productId: product.id,
          label: w.label,
          weightGram: w.gram,
          priceTaka: price,
          stock: 20,
        },
      });

      await prisma.variantCost.upsert({
        where: { variantId: variant.id },
        update: {},
        create: {
          variantId: variant.id,
          rawCostTaka: Math.round(price * 0.6),
          packagingCostTaka: w.pack,
          otherCostTaka: w.other,
          isPublic: false,
          isSample: true,
          note: "SAMPLE - not real business data",
        },
      });
    }
  }

  // Sample delivery zones. Change the real charges later in the admin panel.
  const zoneCount = await prisma.deliveryZone.count();
  if (zoneCount === 0) {
    await prisma.deliveryZone.createMany({
      data: [
        { name: "ঢাকা শহর (নমুনা)", chargeTaka: 60, freeAboveTaka: null },
        { name: "ঢাকার বাইরে (নমুনা)", chargeTaka: 120, freeAboveTaka: null },
      ],
    });
  }

  // Global switch: cost breakdown is private by default.
  await prisma.siteSetting.upsert({
    where: { key: "showCostBreakdownPublic" },
    update: {},
    create: { key: "showCostBreakdownPublic", value: "false" },
  });

  console.log("Sample data added.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });