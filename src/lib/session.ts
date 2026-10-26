import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// A login "ticket" kept in a cookie. It is signed with a secret that only the
// server knows, so nobody can create or change one.

export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours

export type SessionPayload = { sub: string; exp: number; pv: string };

// In production the cookie gets the strict "__Host-" prefix.
export function sessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Host-sotota-admin"
    : "sotota-admin";
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is missing or shorter than 32 characters.");
  }
  return secret;
}

function sign(data: string, secret: string): Buffer {
  return createHmac("sha256", secret)
    .update("sotota-admin-session.v1." + data)
    .digest();
}

// Changes whenever the password changes, so old logins stop working.
export function passwordVersion(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);
}

export function createSessionToken(
  adminId: string,
  pv: string,
  nowMs: number = Date.now()
): string {
  const payload: SessionPayload = {
    sub: adminId,
    exp: Math.floor(nowMs / 1000) + SESSION_MAX_AGE_SECONDS,
    pv,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, getSecret()).toString("base64url")}`;
}

// Returns the ticket contents only if the signature is genuine and not expired.
export function verifySessionToken(
  token: string | undefined | null,
  nowMs: number = Date.now()
): SessionPayload | null {
  if (!token || token.length > 1024) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null; // not set up correctly: nobody is let in
  }

  const expected = sign(body, secret);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  try {
    const data: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof data !== "object" || data === null) return null;
    const { sub, exp, pv } = data as Record<string, unknown>;
    if (typeof sub !== "string" || typeof exp !== "number" || typeof pv !== "string") {
      return null;
    }
    if (exp * 1000 <= nowMs) return null;
    return { sub, exp, pv };
  } catch {
    return null;
  }
}