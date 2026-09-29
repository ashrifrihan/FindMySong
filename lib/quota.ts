import { db } from "./supabase";

export const DAILY_LIMIT = 10;
export const MEMBER_LIMIT = 999;

const today = () => new Date().toISOString().slice(0, 10); // UTC, matches Supabase current_date

// Local fallback cache in case Supabase credentials have restricted RLS permissions
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
  localQuota.set(key, { count: current + 1, day: d });
  return current + 1;
}

/**
 * Uses one search. Returns searches left after this one, or -1 if the limit is reached.
 */
export async function consume(key: string, limit = DAILY_LIMIT): Promise<number> {
  // Members with mobile numbers have unlimited quota
  if (limit >= MEMBER_LIMIT) {
    return MEMBER_LIMIT;
  }

  try {
    const { data, error } = await db().rpc("consume_search", { p_key: key, p_limit: limit });
    if (error) throw new Error(error.message);
    return data as number;
  } catch (err: any) {
    console.warn("Supabase consume_search unavailable or restricted, using memory fallback:", err?.message || err);
    const count = incLocal(key);
    if (count > limit) return -1;
    return Math.max(0, limit - count);
  }
}

export async function remaining(key: string, limit = DAILY_LIMIT): Promise<number> {
  if (limit >= MEMBER_LIMIT) {
    return MEMBER_LIMIT;
  }

  try {
    const { data, error } = await db()
      .from("search_quota")
      .select("count")
      .eq("key", key)
      .eq("day", today())
      .maybeSingle();
    if (error) throw error;
    return Math.max(0, limit - (data?.count ?? 0));
  } catch {
    const count = getLocal(key);
    return Math.max(0, limit - count);
  }
}

export function ipFrom(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "local";
}

/**
 * Extracts quota key, membership state, and applicable daily limit
 */
export function getQuotaContext(
  headers: Headers,
  verifiedUserId?: string | null,
  phoneCookie?: string | null
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
  return {
    key: `ip:${ip}`,
    isMember: false,
    phone: null,
    limit: DAILY_LIMIT,
  };
}
