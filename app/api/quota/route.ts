import { NextRequest, NextResponse } from "next/server";
import { DAILY_LIMIT, ipFrom, remaining } from "@/lib/quota";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({ remaining: await remaining(ipFrom(req.headers)), limit: DAILY_LIMIT });
  } catch {
    return NextResponse.json({ remaining: null, limit: DAILY_LIMIT });
  }
}
