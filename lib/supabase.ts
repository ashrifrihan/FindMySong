import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only client. Never import this from a "use client" file.
let client: SupabaseClient | null = null;

export function db() {
  if (!client) {
    let url = process.env.SUPABASE_URL?.trim();
    if (url?.startsWith("=")) url = url.replace(/^=+/, "").trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}
