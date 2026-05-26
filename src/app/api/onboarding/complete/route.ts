import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const profile = await req.json();
  const res = NextResponse.json({ ok: true, profile });
  res.cookies.set("cefis_profile", JSON.stringify(profile), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
