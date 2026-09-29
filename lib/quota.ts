import { db } from "./supabase";

export const DAILY_LIMIT = 10;
export const MEMBER_LIMIT = 999;

export const today = () => new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD

// In-memory resilient store
const localQuota = new Map<string, { count: number; day: string }>();

function getLocal(key: string): number {
  const d = today();
  const entry = localQuota.get(key);
  if (!entry || entry.day !== d) return 0;
  return entry.count;
}

function incLocal(key: string): number {
  const d = today();
  const current = getLocal(key);
  const next = current + 1;
  localQuota.set(key, { count: next, day: d });
  return next;
}

/**
 * Parses the daily quota cookie (format: "YYYY-MM-DD:count")
 * If the date is yesterday or invalid, count resets to 0.
 */
export function parseQuotaCookie(cookieVal?: string | null): number {
  if (!cookieVal) return 0;
  const parts = cookieVal.split(":");
  if (parts.length !== 2) return 0;
  const [day, countStr] = parts;
  if (day !== today()) return 0;
  const count = parseInt(countStr, 10);
  return isNaN(count) || count < 0 ? 0 : count;
}

export function formatQuotaCookie(count: number): string {
  return `${today()}:${count}`;
}

export function ipFrom(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    "local"
  );
}

/**
 * Extracts quota key, membership state, and applicable daily limit
 */
export function getQuotaContext(
  headers: Headers,
  verifiedUserId?: string | null,
  phoneCookie?: string | null,
  deviceId?: string | null
) {
  if (verifiedUserId) {
    return {
      key: `user:${verifiedUserId}`,
      isMember: true,
      phone: null,
      limit: MEMBER_LIMIT,
    };
  }

  const phone = (phoneCookie || "").replace(/[^\d+]/g, "").trim();
  const isLegacyMember = phone.length >= 8;

  if (isLegacyMember) {
    return {
      key: `phone:${phone}`,
      isMember: true,
      phone,
      limit: MEMBER_LIMIT,
    };
  }

  const ip = ipFrom(headers);
  const dev = deviceId ? deviceId.slice(0, 16) : "client";
  return {
    key: `ip:${ip}:${dev}`,
    isMember: false,
    phone: null,
    limit: DAILY_LIMIT,
  };
}

/**
 * Calculates remaining searches for today across all layers:
 * Cookie counter (guaranteed device tracking), Supabase (shared DB), and in-memory cache.
 */
export async function remaining(
  key: string,
  limit = DAILY_LIMIT,
  cookieCount = 0
): Promise<number> {
  if (limit >= MEMBER_LIMIT) {
    return MEMBER_LIMIT;
  }

  let dbCount = 0;
  try {
    const { data } = await db()
      .from("search_quota")
      .select("count")
      .eq("key", key)
      .eq("day", today())
      .maybeSingle();

    if (data?.count && typeof data.count === "number") {
      dbCount = data.count;
    }
  } catch {}

  const memCount = getLocal(key);
  const highestUsed = Math.max(dbCount, cookieCount, memCount);
  return Math.max(0, limit - highestUsed);
}

/**
 * Consumes one search atomically and returns remaining quota and cookie payload.
 */
export async function consume(
  key: string,
  limit = DAILY_LIMIT,
  currentCookieCount = 0
): Promise<{ remaining: number; cookiePayload: string }> {
  if (limit >= MEMBER_LIMIT) {
    return { remaining: MEMBER_LIMIT, cookiePayload: formatQuotaCookie(0) };
  }

  const memCount = incLocal(key);
  const newCount = Math.max(memCount, currentCookieCount + 1);

  // Best-effort Supabase sync
  try {
    const { error } = await db().rpc("consume_search", { p_key: key, p_limit: limit });
    if (error) {
      await db().from("search_quota").upsert({ key, day: today(), count: newCount });
    }
  } catch {}

  const left = Math.max(0, limit - newCount);
  return {
    remaining: left,
    cookiePayload: formatQuotaCookie(newCount),
  };
}
