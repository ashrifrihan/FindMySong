import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const origin = req.nextUrl.origin;

  if (code) {
    try {
      const { data, error } = await db().auth.exchangeCodeForSession(code);

      if (!error && data?.session && data.user) {
        const user = data.user;
        const res = NextResponse.redirect(`${origin}/?auth_success=true`);

        const cookieOpts = {
          path: "/",
          maxAge: 30 * 24 * 60 * 60, // 30 days
          httpOnly: true,
          sameSite: "lax" as const,
          secure: process.env.NODE_ENV === "production",
        };

        // Secure server-only authentication cookie
        res.cookies.set("fms_auth_token", data.session.access_token, cookieOpts);
        res.cookies.set("fms_user_id", user.id, cookieOpts);

        // Readable display cookies for UI
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Creator";
        res.cookies.set("fms_user_name", name, { ...cookieOpts, httpOnly: false });
        res.cookies.set("fms_user_email", user.email || "", { ...cookieOpts, httpOnly: false });

        return res;
      }
    } catch (err) {
      console.error("Auth callback error:", err);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=Verification+failed`);
}
