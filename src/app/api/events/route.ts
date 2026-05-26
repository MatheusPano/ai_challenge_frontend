import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backend } from "@/lib/backend";

type StyleWeights = {
  visual: number;
  aural: number;
  reading: number;
  kinesthetic: number;
};

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const data = await backend<{ ok: boolean; styleWeights: StyleWeights }>(
      "/api/events",
      { method: "POST", body: JSON.stringify(body) },
    );
    // Mirror updated styleWeights into the profile cookie so the
    // plan generator (still on Next) sees fresh weights.
    const jar = await cookies();
    const profileRaw = jar.get("cefis_profile")?.value;
    if (profileRaw && data.styleWeights) {
      try {
        const profile = JSON.parse(profileRaw);
        profile.styleWeights = data.styleWeights;
        const res = NextResponse.json(data);
        res.cookies.set("cefis_profile", JSON.stringify(profile), {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        });
        return res;
      } catch {
        // fall through
      }
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: String(e) },
      { status: 502 },
    );
  }
}
