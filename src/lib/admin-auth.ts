import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  passwordVersion,
  sessionCookieName,
  verifySessionToken,
} from "@/lib/session";

export type AdminInfo = { id: string; email: string; name: string };

function cookieOptions() {
  return {
    httpOnly: true, // JavaScript on the page can never read it
    secure: process.env.NODE_ENV === "production", // HTTPS only on the live site
    sameSite: "strict" as const, // never sent from other websites
    path: "/",
  };
}

// Who is logged in right now? Checks the signed ticket AND the database.
export async function getAdmin(): Promise<AdminInfo | null> {
  const store = await cookies();
  const payload = verifySessionToken(store.get(sessionCookieName())?.value);
  if (!payload) return null;

  const admin = await db.adminUser.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, passwordHash: true },
  });
  if (!admin) return null;

  // If the password was changed, every older login stops working.
  if (passwordVersion(admin.passwordHash) !== payload.pv) return null;

  return { id: admin.id, email: admin.email, name: admin.name };
}

// Put this at the top of every admin page and every admin action.
export async function requireAdmin(): Promise<AdminInfo> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function startSession(admin: {
  id: string;
  passwordHash: string;
}): Promise<void> {
  const store = await cookies();
  store.set(
    sessionCookieName(),
    createSessionToken(admin.id, passwordVersion(admin.passwordHash)),
    { ...cookieOptions(), maxAge: SESSION_MAX_AGE_SECONDS }
  );
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.set(sessionCookieName(), "", { ...cookieOptions(), maxAge: 0 });
}