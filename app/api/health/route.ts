import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: any = {
    status: "ok",
    timestamp: new Date().toISOString(),
    system: "FindMySong",
    musicApi: { status: "unknown" },
    supabase: { status: "unknown" },
  };

  // 1. Check Music API (Deezer)
  const startTime = Date.now();
  try {
    const res = await fetch("https://api.deezer.com/search/track?q=eminem&limit=1", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      result.musicApi = {
        status: "ok",
        provider: "Deezer Public API",
        sampleTracksFound: data.data?.length || 0,
        latencyMs: Date.now() - startTime,
      };
    } else {
      result.musicApi = {
        status: "error",
        statusCode: res.status,
        latencyMs: Date.now() - startTime,
      };
      result.status = "degraded";
    }
  } catch (err: any) {
    result.musicApi = {
      status: "error",
      error: err?.message || String(err),
      latencyMs: Date.now() - startTime,
    };
    result.status = "degraded";
  }

  // 2. Check Supabase
  const rawUrl = process.env.SUPABASE_URL || "";
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const keyType = rawKey.startsWith("sb_publishable_")
    ? "publishable (anon)"
    : rawKey.startsWith("sb_secret_")
    ? "service_role (secret)"
    : rawKey.length > 20
    ? "jwt / token"
    : "missing";

  result.supabase = {
    configured: Boolean(rawUrl && rawKey),
    url: rawUrl ? `${rawUrl.slice(0, 20)}...` : "missing",
    keyType,
    tables: {},
  };

  if (!rawUrl || !rawKey) {
    result.supabase.status = "not_configured";
    result.status = "warning";
  } else {
    try {
      const client = db();

      // Test search_cache
      const { error: cacheErr } = await client.from("search_cache").select("key").limit(1);
      result.supabase.tables.search_cache = cacheErr ? `error: ${cacheErr.message}` : "accessible";

      // Test search_quota
      const { error: quotaErr } = await client.from("search_quota").select("key").limit(1);
      result.supabase.tables.search_quota = quotaErr ? `error: ${quotaErr.message}` : "accessible";

      // Test saved_items
      const { error: savedErr } = await client.from("saved_items").select("device_id").limit(1);
      result.supabase.tables.saved_items = savedErr ? `error: ${savedErr.message}` : "accessible";

      // Test consume_search RPC
      const { error: rpcErr } = await client.rpc("consume_search", { p_key: "health-check", p_limit: 10 });
      if (rpcErr) {
        result.supabase.rpc_consume_search = `restricted: ${rpcErr.message}`;
        if (keyType.includes("publishable")) {
          result.supabase.note =
            "SUPABASE_SERVICE_ROLE_KEY is currently set to a publishable key. In Supabase Dashboard -> Project Settings -> API, copy the 'service_role' secret key to enable atomic quota RPC & server cache writes. In-memory fallback is active so music search continues working.";
        }
      } else {
        result.supabase.rpc_consume_search = "working";
      }

      result.supabase.status = "connected";
    } catch (err: any) {
      result.supabase.status = "error";
      result.supabase.error = err?.message || String(err);
      result.status = "warning";
    }
  }

  return NextResponse.json(result, { status: 200 });
}
