"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { verifyAgainstDummy, verifyPassword } from "@/lib/password";
import { endSession, startSession } from "@/lib/admin-auth";

export type LoginState = { error: string | null; email?: string };

const WRONG = "ইমেইল বা পাসওয়ার্ড সঠিক নয়।";
const LOCKED = "অনেকবার ভুল চেষ্টা হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন।";
const SETUP = "সার্ভার ঠিকমতো সেট করা নেই। ডেভেলপারকে জানান।";

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function login(
  _previous: LoginState,
  formData: FormData
): Promise<LoginState> {
  const rawEmail = formData.get("email");
  const password = formData.get("password");
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase().slice(0, 254) : "";

  if (!email || typeof password !== "string" || password.length === 0 || password.length > 200) {
    return { error: WRONG, email };
  }

  // Layer 1: too many tries from one device or network.
  const ip = await clientIp();
  if (!rateLimit(`login-ip:${ip}`, 10, WINDOW_MS)) {
    return { error: LOCKED, email };
  }

  let admin: { id: string; passwordHash: string } | null = null;

  try {
    // Layer 2: too many wrong tries for one email (saved in the database,
    // so it works even when the site runs on many servers).
    const since = new Date(Date.now() - WINDOW_MS);
    const failures = await db.adminLoginFailure.count({
      where: { email, createdAt: { gte: since } },
    });
    if (failures >= MAX_FAILURES) return { error: LOCKED, email };

    const found = await db.adminUser.findUnique({ where: { email } });

    let passwordOk = false;
    if (found) {
      passwordOk = await verifyPassword(password, found.passwordHash);
    } else {
      await verifyAgainstDummy(password); // same waiting time as a real check
    }

    if (!found || !passwordOk) {
      // Wrong email and wrong password look exactly the same from outside.
      await db.adminLoginFailure.create({ data: { email } });
      await db.adminLoginFailure.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } },
      });
      return { error: WRONG, email };
    }

    await db.adminLoginFailure.deleteMany({ where: { email } });
    await startSession(found);
    admin = found;
  } catch (e) {
    console.error("admin login failed", e);
    return { error: SETUP, email };
  }

  if (admin) redirect("/admin/dashboard");
  return { error: WRONG, email };
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}