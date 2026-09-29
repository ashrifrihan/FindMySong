import { NextRequest, NextResponse } from "next/server";
import { recordCopy } from "@/lib/db-music";

export const dynamic = "force-dynamic";

// Daily copy debounce map: max 1 copy count per device per song per day
const dailyCopyMap = new Map<string, number>();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function cleanupOldEntries() {
  const now = Date.now();
  if (dailyCopyMap.size > 20000) {
    for (const [key, timestamp] of dailyCopyMap.entries()) {
      if (now - timestamp > ONE_DAY_MS) {
        dailyCopyMap.delete(key);
      }
    }
  }
}

function getDeviceId(req: NextRequest): string {
  return (
    req.cookies.get("tc_device")?.value ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "anonymous"
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, isrc, title, artist, itemKey } = body;

    if (!isrc && !itemKey) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const deviceId = getDeviceId(req);
    const today = new Date().toISOString().slice(0, 10);
    const dedupeKey = `${deviceId}:${isrc || itemKey}:${today}`;

    // Count at most one copy per device per song per day to prevent ranking manipulation
    if (dailyCopyMap.has(dedupeKey)) {
      return NextResponse.json({ ok: true, deduplicated: true });
    }

    dailyCopyMap.set(dedupeKey, Date.now());
    cleanupOldEntries();

    // Record copy event asynchronously to build learned corrections and popularity
    await recordCopy(query || "", isrc || "", title || "", artist || "", itemKey || "");

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
