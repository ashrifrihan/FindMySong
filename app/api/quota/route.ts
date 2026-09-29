import { NextRequest, NextResponse } from "next/server";
import { getQuotaContext, remaining } from "@/lib/quota";
import { getVerifiedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const verifiedUser = await getVerifiedUser(req);
  const phoneCookie = req.cookies.get("findmysong_phone")?.value;
  const ctx = getQuotaContext(req.headers, verifiedUser?.id, phoneCookie);

  try {
    const rem = await remaining(ctx.key, ctx.limit);
    return NextResponse.json({
      remaining: rem,
      limit: ctx.limit,
      isMember: ctx.isMember,
      name: verifiedUser?.name || null,
      email: verifiedUser?.email || null,
    });
  } catch {
    return NextResponse.json({
      remaining: ctx.isMember ? ctx.limit : null,
      limit: ctx.limit,
      isMember: ctx.isMember,
      name: verifiedUser?.name || null,
      email: verifiedUser?.email || null,
    });
  }
}
