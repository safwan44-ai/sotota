import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { ScryptOptions } from "node:crypto";

// Passwords are never stored. Only a slow one-way "scrypt" hash is stored.
// Stored format: scrypt$N$r$p$salt$hash  (the settings travel with the hash,
// so they can be made stronger later without breaking old passwords).

const N = 65536; // 2^16
const R = 8;
const P = 2;
const KEY_LENGTH = 64;
const MAX_MEMORY = 256 * 1024 * 1024;

function scryptAsync(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

function prepare(password: string): string {
  return password.normalize("NFKC");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(prepare(password), salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: MAX_MEMORY,
  });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;

    const n = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const okN = Number.isInteger(n) && n >= 2 ** 14 && n <= 2 ** 20 && (n & (n - 1)) === 0;
    if (!okN || !Number.isInteger(r) || r < 1 || r > 16) return false;
    if (!Number.isInteger(p) || p < 1 || p > 16) return false;
    if (128 * n * r > MAX_MEMORY) return false;

    const salt = Buffer.from(parts[4], "base64");
    const expected = Buffer.from(parts[5], "base64");
    if (salt.length < 8 || expected.length < 16 || expected.length > 128) return false;

    const actual = await scryptAsync(prepare(password), salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: MAX_MEMORY,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// Used when the email does not exist, so a wrong email takes about as long as
// a wrong password and cannot be told apart by timing.
let dummyHash: Promise<string> | null = null;
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummyHash);
}

// Returns a problem description, or null when the password is acceptable.
export function checkPasswordStrength(password: string, email = ""): string | null {
  if (password.length < 12) return "Use at least 12 characters.";
  if (password.length > 128) return "Use at most 128 characters.";
  if (/^(.)\1+$/.test(password)) return "Do not repeat one character.";

  const lower = password.toLowerCase();
  const weak = ["password", "sotota", "123456", "qwerty", "adminadmin", "letmein"];
  if (weak.some((w) => lower.includes(w))) {
    return "This password is too easy to guess.";
  }

  const name = email.split("@")[0]?.toLowerCase() ?? "";
  if (name.length >= 4 && lower.includes(name)) {
    return "Do not use your email name inside the password.";
  }
  return null;
}