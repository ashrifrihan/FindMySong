import { NextRequest, NextResponse } from "next/server";
import { cleanSearchQuery } from "@/lib/queryCleaner";
import { generateSoundKey } from "@/lib/phonetics";
import { queryOwnCatalog } from "@/lib/db-music";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rawQ = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);
  if (!rawQ || rawQ.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const parsed = cleanSearchQuery(rawQ);
  const soundKey = generateSoundKey(parsed.cleaned);

  try {
    const matched = await queryOwnCatalog(soundKey, parsed.cleaned);

    // Limit to top 5 most relevant/popular items
    const suggestions = matched.slice(0, 5).map((item) => ({
      key: item.key,
      title: item.title,
      artist: item.artist,
      cover: item.cover,
      code: item.code,
      codeType: item.codeType,
      kind: item.kind,
    }));

    return NextResponse.json({ suggestions });
  } catch (err: any) {
    return NextResponse.json({ suggestions: [] });
  }
}
