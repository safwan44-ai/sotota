"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { changeOrderStatus } from "@/lib/order-admin";
import { OrderError } from "@/lib/orders";
import { looksLikeOrderNo } from "@/lib/tracking";

export type StatusChangeState = { error: string | null; done?: boolean };

export async function updateOrderStatus(
  _previous: StatusChangeState,
  formData: FormData
): Promise<StatusChangeState> {
  // Every admin action checks the login again, on its own.
  const admin = await requireAdmin();

  const orderNo = formData.get("orderNo");
  const status = formData.get("status");
  const rawNote = formData.get("note");

  if (typeof orderNo !== "string" || !looksLikeOrderNo(orderNo)) {
    return { error: "অর্ডার নম্বর সঠিক নয়।" };
  }
  if (typeof status !== "string" || status === "") {
    return { error: "নতুন অবস্থা বেছে নিন।" };
  }
  const note =
    typeof rawNote === "string" && rawNote.trim() !== ""
      ? rawNote.trim().slice(0, 300)
      : null;

  try {
    await changeOrderStatus(db, {
      orderNo,
      newStatus: status,
      note,
      changedBy: admin.email,
    });
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    console.error("updateOrderStatus failed", e);
    return { error: "অবস্থা বদলানো যায়নি। আবার চেষ্টা করুন।" };
  }

  revalidatePath(`/admin/orders/${orderNo}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  return { error: null, done: true };
}