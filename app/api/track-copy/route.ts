import { NextRequest, NextResponse } from "next/server";
import { recordCopy } from "@/lib/db-music";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, isrc, title, artist, itemKey } = body;

    if (!isrc && !itemKey) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Record copy event asynchronously to build learned corrections and popularity
    await recordCopy(query || "", isrc || "", title || "", artist || "", itemKey || "");

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
