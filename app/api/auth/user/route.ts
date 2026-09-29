import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUser } from "@/lib/auth";
import { MEMBER_LIMIT, DAILY_LIMIT } from "@/lib/quota";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getVerifiedUser(req);

  if (user) {
    return NextResponse.json({
      isMember: true,
      name: user.name,
      email: user.email,
      limit: MEMBER_LIMIT,
    });
  }

  // Check legacy phone cookie if any
  const phone = req.cookies.get("findmysong_phone")?.value || "";
  const legacyName = req.cookies.get("findmysong_name")?.value || "";
  if (phone.length >= 8) {
    return NextResponse.json({
      isMember: true,
      name: legacyName || "Creator",
      email: null,
      limit: MEMBER_LIMIT,
    });
  }

  return NextResponse.json({
    isMember: false,
    name: null,
    email: null,
    limit: DAILY_LIMIT,
  });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, isMember: false });
  res.cookies.delete("fms_auth_token");
  res.cookies.delete("fms_user_id");
  res.cookies.delete("fms_user_name");
  res.cookies.delete("fms_user_email");
  res.cookies.delete("findmysong_phone");
  res.cookies.delete("findmysong_name");
  return res;
}
