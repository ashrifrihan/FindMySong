import { NextRequest, NextResponse } from "next/server";
import { getQuotaContext, remaining, parseQuotaCookie } from "@/lib/quota";
import { getVerifiedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const verifiedUser = await getVerifiedUser(req);
  const phoneCookie = req.cookies.get("findmysong_phone")?.value;
  const deviceId = req.cookies.get("tc_device")?.value;
  const quotaCookie = req.cookies.get("fms_quota")?.value;
  const cookieCount = parseQuotaCookie(quotaCookie);

  const ctx = getQuotaContext(req.headers, verifiedUser?.id, phoneCookie, deviceId);
  const rem = await remaining(ctx.key, ctx.limit, cookieCount);

  return NextResponse.json({
    remaining: rem,
    limit: ctx.limit,
    isMember: ctx.isMember,
    name: verifiedUser?.name || null,
    email: verifiedUser?.email || null,
  });
}
