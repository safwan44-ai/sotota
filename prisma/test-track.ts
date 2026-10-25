import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createOrder } from "../src/lib/orders";
import { findOrderForTracking } from "../src/lib/tracking";

// Places one TEST order, then checks the Track Order lookup against your real
// database. It deletes the test order and puts the stock back afterwards.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

let failed = false;
function check(name: string, pass: boolean, extra = "") {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${extra ? "  (" + extra + ")" : ""}`);
  if (!pass) failed = true;
}

async function main() {
  const variant = await prisma.productVariant.findFirst({
    where: { isActive: true, stock: { gte: 3 }, product: { isActive: true } },
  });
  const zone = await prisma.deliveryZone.findFirst({ where: { isActive: true } });

  if (!variant || !zone) {
    console.log("Need one product weight with stock 3 or more, and one delivery zone.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  const phone = "01700000003";
  const stockBefore = variant.stock;
  let orderNo: string | null = null;

  try {
    const created = await createOrder(prisma, {
      items: [{ variantId: variant.id, qty: 1 }],
      zoneId: zone.id,
      couponCode: null,
      customer: {
        name: "TEST TRACK",
        phone,
        address: "TEST ADDRESS - please ignore",
        note: "secret note that must stay private",
      },
    });
    orderNo = created.orderNo;

    const found = await findOrderForTracking(prisma, created.orderNo, phone);
    check("order is found with the right number and phone", found !== null);
    check("status is PENDING with 1 history step", found?.status === "PENDING" && found?.history.length === 1);
    check("1 item and the right total", found?.items.length === 1 && found?.totalTaka === created.totalTaka, `${found?.totalTaka}`);
    check("zone name is shown", found?.zoneName === zone.name);

    const text = JSON.stringify(found);
    check("no address, phone, name or note leaks out", !text.includes("TEST ADDRESS") && !text.includes(phone) && !text.includes("TEST TRACK") && !text.includes("secret note"));

    check("wrong phone finds nothing", (await findOrderForTracking(prisma, created.orderNo, "01799999999")) === null);
    check("wrong order number finds nothing", (await findOrderForTracking(prisma, "SOT000000-00000", phone)) === null);
    check("junk input finds nothing", (await findOrderForTracking(prisma, "' OR 1=1 --", phone)) === null);
  } finally {
    if (orderNo) {
      await prisma.order.delete({ where: { orderNo } });
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { stock: { increment: 1 } },
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