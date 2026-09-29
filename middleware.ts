import { NextResponse, type NextRequest } from "next/server";

// Gives every browser an anonymous id (used for the Saved list).
export function middleware(req: NextRequest) {
  if (req.cookies.get("tc_device")) return NextResponse.next();

  const id = crypto.randomUUID();
  const headers = new Headers(req.headers);
  const existing = req.headers.get("cookie");
  headers.set("cookie", existing ? `${existing}; tc_device=${id}` : `tc_device=${id}`);

  const res = NextResponse.next({ request: { headers } });
  res.cookies.set("tc_device", id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 730,
    path: "/",
  });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
