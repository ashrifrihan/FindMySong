import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const redirectTo = `${origin}/api/auth/callback`;

  try {
    const { data, error } = await db().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error || !data?.url) {
      console.error("Supabase Google OAuth initiation error:", error);
      return NextResponse.redirect(
        `${origin}/?auth_error=${encodeURIComponent(
          error?.message || "Google sign-in is not configured yet in Supabase Auth."
        )}`
      );
    }

    return NextResponse.redirect(data.url);
  } catch (err: any) {
    console.error("Google Auth error:", err);
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent(err?.message || "Sign-in failed")}`
    );
  }
}
