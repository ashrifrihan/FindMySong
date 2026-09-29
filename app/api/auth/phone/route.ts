import { NextRequest, NextResponse } from "next/server";
import { MEMBER_LIMIT } from "@/lib/quota";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const phone = req.cookies.get("findmysong_phone")?.value || "";
  const isMember = phone.length >= 8;

  return NextResponse.json({
    isMember,
    phone: isMember ? phone : null,
    limit: isMember ? MEMBER_LIMIT : 10,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone = (body.phone || "").trim();

    // Clean phone number (keep digits and leading +)
    const cleanPhone = rawPhone.replace(/[^\d+]/g, "");

    // Validation: international or local phone numbers usually have 8 to 15 digits
    const digitsOnly = cleanPhone.replace(/\D/g, "");
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      return NextResponse.json(
        { error: "Please enter a valid mobile number with country code (e.g. +91 98765 43210 or +94 77 123 4567)." },
        { status: 400 }
      );
    }

    const res = NextResponse.json({
      ok: true,
      phone: cleanPhone,
      isMember: true,
      remaining: MEMBER_LIMIT,
      limit: MEMBER_LIMIT,
    });

    // Set persistent 1-year cookie
    res.cookies.set("findmysong_phone", cleanPhone, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: false, // Accessible to client for instant UI state sync
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, isMember: false });
  res.cookies.delete("findmysong_phone");
  return res;
}
