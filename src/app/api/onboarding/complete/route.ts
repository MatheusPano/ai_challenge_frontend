import { NextResponse } from "next/server";
import { backend } from "@/lib/backend";

export async function POST(req: Request) {
  const profile = await req.json();
  try {
    const data = await backend<{ ok: boolean; profile: unknown }>(
      "/api/profile/onboarding",
      {
        method: "POST",
        body: JSON.stringify({
          goals: profile.goals,
          categoryIds: profile.categoryIds,
          level: profile.level,
          theta: profile.theta,
          styleWeights: profile.styleWeights,
          topicSignals: profile.topicSignals,
        }),
      },
    );
    const res = NextResponse.json({ ok: true, profile: data.profile });
    // Mirror to cookie so client-side reads stay fast (read-through cache).
    res.cookies.set("cefis_profile", JSON.stringify(profile), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: String(e) },
      { status: 502 },
    );
  }
}
