import type { PrismaClient } from "../generated/prisma/client";
import { OrderError } from "./orders";
import {
  allowedNextStatuses,
  isOrderStatus,
  statusLabel,
} from "./order-status";

// Moves an order to a new status. Everything happens in ONE database
// transaction. If any step fails, nothing is changed.
export async function changeOrderStatus(
  client: PrismaClient,
  args: {
    orderNo: string;
    newStatus: string;
    note: string | null;
    changedBy: string;
  }
): Promise<void> {
  const { newStatus } = args;
  if (!isOrderStatus(newStatus)) {
    throw new OrderError("সঠিক অবস্থা বেছে নিন।", "status");
  }

  await client.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { orderNo: args.orderNo },
        select: {
          id: true,
          status: true,
          couponId: true,
          items: { select: { variantId: true, quantity: true } },
        },
      });
      if (!order) throw new OrderError("অর্ডারটি পাওয়া যায়নি।");

      if (!allowedNextStatuses(order.status).includes(newStatus)) {
        throw new OrderError(
          `"${statusLabel(order.status)}" থেকে "${statusLabel(newStatus)}" করা যায় না।`,
          "status"
        );
      }

      // If two people click at the same moment, only one change wins.
      const changed = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: newStatus },
      });
      if (changed.count !== 1) {
        throw new OrderError(
          "অর্ডারের অবস্থা এইমাত্র বদলে গেছে। পাতাটি রিফ্রেশ করে আবার দেখুন।"
        );
      }

      // A cancelled order gives its stock and its coupon use back.
      if (newStatus === "CANCELLED") {
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
        if (order.couponId) {
          await tx.coupon.updateMany({
            where: { id: order.couponId, usedCount: { gt: 0 } },
            data: { usedCount: { decrement: 1 } },
          });
        }
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: newStatus,
          changedBy: args.changedBy,
          note: args.note,
        },
      });
    },
    { maxWait: 10_000, timeout: 20_000 }
  );
}