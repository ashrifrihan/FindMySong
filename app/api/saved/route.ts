import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import type { Result } from "@/lib/types";

export const dynamic = "force-dynamic";
const MAX_SAVED = 500;

function device(req: NextRequest) {
  return req.cookies.get("tc_device")?.value || null;
}

// Keep only known fields so nothing unexpected is stored.
function clean(x: any): Result | null {
  if (!x || typeof x.key !== "string" || !/^(song|album)-\d+$/.test(x.key)) return null;
  const s = (v: any, n = 300) => (typeof v === "string" ? v.slice(0, n) : undefined);
  return {
    key: x.key,
    kind: x.kind === "album" ? "album" : "song",
    title: s(x.title) ?? "",
    artist: s(x.artist) ?? "",
    album: s(x.album),
    cover: s(x.cover, 500) ?? "",
    code: s(x.code, 40) ?? null,
    codeType: x.codeType === "UPC" ? "UPC" : "ISRC",
    preview: s(x.preview, 500),
    explicit: !!x.explicit,
    year: s(x.year, 4),
  };
}

export async function GET(req: NextRequest) {
  const id = device(req);
  if (!id) return NextResponse.json({ items: [] });
  const { data, error } = await db()
    .from("saved_items")
    .select("item")
    .eq("device_id", id)
    .order("created_at", { ascending: false })
    .limit(MAX_SAVED);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: (data ?? []).map((r) => r.item) });
}

export async function POST(req: NextRequest) {
  const id = device(req);
  const body = await req.json().catch(() => null);
  const item = clean(body?.item);
  if (!id || !item) return NextResponse.json({ error: "Invalid item" }, { status: 400 });

  const { count } = await db().from("saved_items").select("*", { count: "exact", head: true }).eq("device_id", id);
  if ((count ?? 0) >= MAX_SAVED) return NextResponse.json({ error: "Saved list is full" }, { status: 409 });

  const { error } = await db().from("saved_items").upsert({ device_id: id, item_key: item.key, item });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = device(req);
  const key = req.nextUrl.searchParams.get("key");
  if (!id || !key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  const { error } = await db().from("saved_items").delete().eq("device_id", id).eq("item_key", key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
