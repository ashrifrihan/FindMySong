import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only client. Never import this from a "use client" file.
let client: SupabaseClient | null = null;
let clientInitialized = false;

export function isDbConfigured(): boolean {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key);
}

export function db(): SupabaseClient {
  if (!clientInitialized) {
    clientInitialized = true;
    let url = process.env.SUPABASE_URL?.trim();
    if (url?.startsWith("=")) url = url.replace(/^=+/, "").trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (url && key) {
      try {
        client = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      } catch (err) {
        console.warn("Failed to initialize Supabase client:", err);
      }
    } else {
      console.warn(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables on server. Graceful fallback active."
      );
    }
  }

  if (!client) {
    // Resilient fallback client that fails gracefully instead of throwing fatal 500 errors on Vercel
    const dummyQuery: any = {
      select: () => dummyQuery,
      eq: () => dummyQuery,
      gte: () => dummyQuery,
      or: () => dummyQuery,
      gt: () => dummyQuery,
      in: () => Promise.resolve({ data: [], error: null }),
      order: () => dummyQuery,
      limit: () => Promise.resolve({ data: [], error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
      catch: (reject: any) => Promise.resolve({ data: [], error: null }).catch(reject),
    };

    return {
      from: () => ({
        ...dummyQuery,
        upsert: async () => ({ data: null, error: null }),
        insert: async () => ({ data: null, error: null }),
        delete: () => dummyQuery,
      }),
      rpc: async () => ({
        data: null,
        error: new Error("Supabase credentials not configured in environment variables"),
      }),
      auth: {
        getUser: async () => ({
          data: { user: null },
          error: new Error("Supabase credentials not configured"),
        }),
        signInWithOAuth: async () => ({
          data: { url: null },
          error: new Error("Supabase credentials not configured"),
        }),
        exchangeCodeForSession: async () => ({
          data: { session: null, user: null },
          error: new Error("Supabase credentials not configured"),
        }),
      },
    } as unknown as SupabaseClient;
  }

  return client;
}
