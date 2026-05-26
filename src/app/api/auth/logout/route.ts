import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Expire both cookies
  ["cefis_key", "cefis_user", "cefis_profile"].forEach((name) => {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  });
  return res;
}
