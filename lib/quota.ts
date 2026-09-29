import { db } from "./supabase";

export const DAILY_LIMIT = 10;

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

/** Uses one search. Returns searches left after this one, or -1 if the limit is reached. */
export async function consume(key: string): Promise<number> {
  try {
    const { data, error } = await db().rpc("consume_search", { p_key: key, p_limit: DAILY_LIMIT });
    if (error) throw new Error(error.message);
    return data as number;
  } catch (err: any) {
    console.warn("Supabase consume_search unavailable or restricted, using memory fallback:", err?.message || err);
    const count = incLocal(key);
    if (count > DAILY_LIMIT) return -1;
    return Math.max(0, DAILY_LIMIT - count);
  }
}

export async function remaining(key: string): Promise<number> {
  try {
    const { data, error } = await db()
      .from("search_quota")
      .select("count")
      .eq("key", key)
      .eq("day", today())
      .maybeSingle();
    if (error) throw error;
    return Math.max(0, DAILY_LIMIT - (data?.count ?? 0));
  } catch {
    const count = getLocal(key);
    return Math.max(0, DAILY_LIMIT - count);
  }
}

export function ipFrom(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "local";
}
