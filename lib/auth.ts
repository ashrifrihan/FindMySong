import { NextRequest } from "next/server";
import { db } from "./supabase";

export interface SessionUser {
  id: string;
  email?: string;
  name: string;
}

/**
 * Server-side verification of user session using Supabase Auth.
 * Never trusts unverified client-side cookies.
 */
export async function getVerifiedUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get("fms_auth_token")?.value;
  if (!token) return null;

  try {
    const { data: { user }, error } = await db().auth.getUser(token);
    if (error || !user) return null;

    const name =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Creator";

    return {
      id: user.id,
      email: user.email,
      name,
    };
  } catch {
    return null;
  }
}
