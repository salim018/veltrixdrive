/**
 * Simple in-memory rate limiter for /api/analyze.
 *
 * Two layers:
 *   1. Per-user cooldown — default 25 s between analyses for the same userId.
 *   2. Per-IP sliding window — default 30 requests / 60 s.
 *   3. Idempotency cache — identical payload hash from same user within 60 s
 *      returns the cached response instead of re-charging a credit.
 *
 * NOTE: state is in-memory per Node process. For multi-instance production
 * (Vercel Edge, multiple Node containers, autoscaling) swap the three Maps
 * below for Redis / Upstash / similar. The public API does not change.
 */

export interface RateCheckResult {
  ok: boolean;
  /** "user_cooldown" | "ip_flood" | null */
  reason: string | null;
  /** Seconds until the user may retry. */
  retry_after: number;
}

const USER_COOLDOWN_MS = 10_000;
const IP_WINDOW_MS = 60_000;
const IP_MAX_REQUESTS = 30;
const IDEMPOTENCY_TTL_MS = 60_000;

/** lastRequestAt[userId] */
const userLastAt = new Map<string, number>();

/** ipTimestamps[ip] = list of request timestamps within the window. */
const ipTimestamps = new Map<string, number[]>();

/** idempotency[key] = cached { result, credits, id, at }. */
interface IdempotencyEntry {
  at: number;
  body: unknown;
}
const idempotency = new Map<string, IdempotencyEntry>();

/**
 * Per-user "currently running" set. A user with a request still in flight
 * gets an `analysis_in_progress` response if they fire another one. Prevents
 * a single user from holding two AI calls open simultaneously (and burning
 * two credits if the first one is about to succeed).
 */
const inflightUsers = new Set<string>();

export function isInflight(userId: string): boolean {
  return inflightUsers.has(userId);
}

export function markInflight(userId: string): void {
  inflightUsers.add(userId);
}

export function clearInflight(userId: string): void {
  inflightUsers.delete(userId);
}

function now() {
  return Date.now();
}

/**
 * Check both cooldown and flood. Also RECORDS the attempt (so callers do not
 * need to separately mark). If the attempt is rejected, nothing is recorded.
 */
export function checkRateLimit(opts: {
  userId: string;
  ip: string | null;
}): RateCheckResult {
  const t = now();

  // 1) User cooldown
  const last = userLastAt.get(opts.userId) ?? 0;
  const elapsed = t - last;
  if (elapsed < USER_COOLDOWN_MS) {
    return {
      ok: false,
      reason: "user_cooldown",
      retry_after: Math.ceil((USER_COOLDOWN_MS - elapsed) / 1000)
    };
  }

  // 2) IP flood
  if (opts.ip) {
    const list = ipTimestamps.get(opts.ip) ?? [];
    const cutoff = t - IP_WINDOW_MS;
    const recent = list.filter((ts) => ts >= cutoff);
    if (recent.length >= IP_MAX_REQUESTS) {
      ipTimestamps.set(opts.ip, recent); // trim anyway
      return {
        ok: false,
        reason: "ip_flood",
        retry_after: Math.ceil((recent[0] + IP_WINDOW_MS - t) / 1000)
      };
    }
    recent.push(t);
    ipTimestamps.set(opts.ip, recent);
  }

  userLastAt.set(opts.userId, t);
  return { ok: true, reason: null, retry_after: 0 };
}

// ---------- idempotency ----------

/**
 * Stable string hash (djb2). Not cryptographic — we only need a compact
 * key to detect duplicate payloads within the idempotency window.
 */
export function hashIdempotencyKey(userId: string, payload: unknown): string {
  const s = `${userId}:${safeStringify(payload)}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return `idem_${(h >>> 0).toString(36)}_${s.length}`;
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Returns the cached body if one exists and is still fresh; else null. */
export function getIdempotentResponse(key: string): unknown | null {
  const entry = idempotency.get(key);
  if (!entry) return null;
  if (now() - entry.at > IDEMPOTENCY_TTL_MS) {
    idempotency.delete(key);
    return null;
  }
  return entry.body;
}

export function setIdempotentResponse(key: string, body: unknown): void {
  idempotency.set(key, { at: now(), body });
  // light-touch cleanup: if the map grows too large, evict expired entries
  if (idempotency.size > 10_000) {
    const cutoff = now() - IDEMPOTENCY_TTL_MS;
    for (const [k, v] of idempotency.entries()) {
      if (v.at < cutoff) idempotency.delete(k);
    }
  }
}

// ---------- helpers ----------

/**
 * Best-effort client IP from a Request. Trusts the first entry of
 * X-Forwarded-For (Vercel / most reverse proxies set this).
 */
export function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}
