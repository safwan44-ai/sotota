import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createOrder, OrderError } from "../src/lib/orders";

// This script places TEST orders in your real database, checks the results,
// then deletes the test orders and puts the stock back.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

let failed = false;
function check(name: string, pass: boolean, extra = "") {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${extra ? "  (" + extra + ")" : ""}`);
  if (!pass) failed = true;
}

async function refused(run: () => Promise<unknown>): Promise<boolean> {
  try {
    await run();
    return false;
  } catch (e) {
    return e instanceof OrderError;
  }
}

async function main() {
  const variant = await prisma.productVariant.findFirst({
    where: { isActive: true, stock: { gte: 5 }, product: { isActive: true } },
    include: { product: true },
  });
  const zone = await prisma.deliveryZone.findFirst({ where: { isActive: true } });

  if (!variant || !zone) {
    console.log("Need one product weight with stock 5 or more, and one delivery zone.");
    console.log("Run the seed first: npx tsx prisma/seed.ts");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  const base = {
    address: "TEST ADDRESS - please ignore",
    note: "created by test script",
  };
  const stockBefore = variant.stock;
  const orderNos: string[] = [];
  let couponId: string | null = null;
  let stockTaken = 0;

  try {
    // 1. A normal order
    const created = await createOrder(prisma, {
      items: [{ variantId: variant.id, qty: 2 }],
      zoneId: zone.id,
      couponCode: null,
      customer: { ...base, name: "TEST ORDER", phone: "01700000000" },
    });
    orderNos.push(created.orderNo);
    stockTaken += 2;

    const subtotal = variant.priceTaka * 2;
    const delivery =
      zone.freeAboveTaka !== null && subtotal >= zone.freeAboveTaka
        ? 0
        : zone.chargeTaka;

    check("order number looks right", /^SOT\d{6}-\d{5}$/.test(created.orderNo), created.orderNo);
    check("total = products + delivery", created.totalTaka === subtotal + delivery, `${created.totalTaka} = ${subtotal} + ${delivery}`);

    const saved = await prisma.order.findUnique({
      where: { orderNo: created.orderNo },
      include: { items: true, history: true },
    });
    check("order saved with 1 item and 1 history row", !!saved && saved.items.length === 1 && saved.history.length === 1);
    check("status is PENDING and payment is COD", saved?.status === "PENDING" && saved?.paymentMethod === "COD");

    const afterOrder = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    check("stock went down by 2", afterOrder?.stock === stockBefore - 2, `${stockBefore} -> ${afterOrder?.stock}`);

    // 2. Asking for more than the stock must fail and change nothing
    check(
      "order bigger than stock is refused",
      await refused(() =>
        createOrder(prisma, {
          items: [{ variantId: variant.id, qty: stockBefore + 100 }],
          zoneId: zone.id,
          couponCode: null,
          customer: { ...base, name: "TEST ORDER", phone: "01700000001" },
        })
      )
    );
    const afterRefuse = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    check("refused order did not change stock", afterRefuse?.stock === stockBefore - 2);

    // 3. A made-up delivery zone must be refused
    check(
      "unknown delivery zone is refused",
      await refused(() =>
        createOrder(prisma, {
          items: [{ variantId: variant.id, qty: 1 }],
          zoneId: "no-such-zone",
          couponCode: null,
          customer: { ...base, name: "TEST ORDER", phone: "01700000001" },
        })
      )
    );

    // 4. Coupon: 10 percent, typed in lower case
    const coupon = await prisma.coupon.create({
      data: { code: "TESTCP" + Date.now(), type: "PERCENT", value: 10, minOrderTaka: 0, maxUses: 5 },
    });
    couponId = coupon.id;

    const withCoupon = await createOrder(prisma, {
      items: [{ variantId: variant.id, qty: 1 }],
      zoneId: zone.id,
      couponCode: coupon.code.toLowerCase(),
      customer: { ...base, name: "TEST ORDER", phone: "01700000002" },
    });
    orderNos.push(withCoupon.orderNo);
    stockTaken += 1;

    const price1 = variant.priceTaka;
    const discount = Math.floor((price1 * 10) / 100);
    const delivery1 =
      zone.freeAboveTaka !== null && price1 >= zone.freeAboveTaka ? 0 : zone.chargeTaka;
    check("coupon discount is applied", withCoupon.totalTaka === price1 - discount + delivery1, `${withCoupon.totalTaka} = ${price1} - ${discount} + ${delivery1}`);

    const usedCoupon = await prisma.coupon.findUnique({ where: { id: coupon.id } });
    check("coupon use was counted", usedCoupon?.usedCount === 1);
  } finally {
    // Clean up: remove the test orders, the test coupon, and give the stock back.
    for (const no of orderNos) {
      await prisma.order.delete({ where: { orderNo: no } });
    }
    if (couponId) {
      await prisma.coupon.delete({ where: { id: couponId } });
    }
    if (stockTaken > 0) {
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { stock: { increment: stockTaken } },
      });
    }
    const final = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    check("test data removed and stock is back to the original", final?.stock === stockBefore, `${final?.stock}`);
    await prisma.$disconnect();
  }

  console.log(failed ? "\nSOME CHECKS FAILED" : "\nALL CHECKS PASSED");
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});