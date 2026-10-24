// Simple in-memory limiter. It slows down careless abuse, but it resets when
// the server restarts and is not shared between servers. Stronger protection
// (for example a firewall or Upstash) can be added before heavy traffic.

const hits = new Map<string, number[]>();

// Returns true if the request is allowed.
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return true;
}