import { NextRequest, NextResponse } from "next/server";
import { getQuotaContext, remaining } from "@/lib/quota";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const phoneCookie = req.cookies.get("findmysong_phone")?.value;
  const ctx = getQuotaContext(req.headers, phoneCookie);

  try {
    const rem = await remaining(ctx.key, ctx.limit);
    return NextResponse.json({
      remaining: rem,
      limit: ctx.limit,
      isMember: ctx.isMember,
      phone: ctx.phone,
    });
  } catch {
    return NextResponse.json({
      remaining: ctx.isMember ? ctx.limit : null,
      limit: ctx.limit,
      isMember: ctx.isMember,
      phone: ctx.phone,
    });
  }
}
