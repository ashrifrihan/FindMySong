import { NextRequest, NextResponse } from "next/server";
import { MEMBER_LIMIT } from "@/lib/quota";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const phone = req.cookies.get("findmysong_phone")?.value || "";
  const name = req.cookies.get("findmysong_name")?.value || "";
  const isMember = phone.length >= 8;

  return NextResponse.json({
    isMember,
    name: isMember ? name : null,
    phone: isMember ? phone : null,
    limit: isMember ? MEMBER_LIMIT : 10,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawName = (body.name || "").trim();
    const rawPhone = (body.phone || "").trim();

    if (rawName.length < 2) {
      return NextResponse.json(
        { error: "Please enter your name (at least 2 characters)." },
        { status: 400 }
      );
    }

    // Clean phone number (keep digits and leading +)
    const cleanPhone = rawPhone.replace(/[^\d+]/g, "");
    const digitsOnly = cleanPhone.replace(/\D/g, "");

    // Check Sri Lanka (+94) numbers
    if (cleanPhone.startsWith("+94")) {
      const localDigits = digitsOnly.startsWith("94") ? digitsOnly.slice(2) : digitsOnly;
      const normalized = localDigits.startsWith("0") ? localDigits.slice(1) : localDigits;

      // Valid Sri Lankan mobile prefixes: 70, 71, 72, 74, 75, 76, 77, 78 (9 digits total)
      if (!/^(7[01245678]\d{7})$/.test(normalized)) {
        return NextResponse.json(
          { error: "Please enter a valid Sri Lankan mobile number starting with 07X (e.g. 77 123 4567)." },
          { status: 400 }
        );
      }

      // Reject dummy repetitive sequences
      if (/^(\d)\1{8}$/.test(normalized) || normalized === "123456789") {
        return NextResponse.json(
          { error: "Please enter your real active mobile number." },
          { status: 400 }
        );
      }
    } else {
      if (digitsOnly.length < 8 || digitsOnly.length > 15) {
        return NextResponse.json(
          { error: "Please enter a valid mobile number with at least 8 digits." },
          { status: 400 }
        );
      }
    }

    const res = NextResponse.json({
      ok: true,
      name: rawName,
      phone: cleanPhone,
      isMember: true,
      remaining: MEMBER_LIMIT,
      limit: MEMBER_LIMIT,
    });

    const cookieOptions = {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax" as const,
      httpOnly: false,
    };

    // Set persistent 1-year cookies for phone and name
    res.cookies.set("findmysong_phone", cleanPhone, cookieOptions);
    res.cookies.set("findmysong_name", rawName, cookieOptions);

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, isMember: false });
  res.cookies.delete("findmysong_phone");
  res.cookies.delete("findmysong_name");
  return res;
}
