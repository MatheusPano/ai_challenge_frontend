import { NextResponse } from "next/server";
import { cookies } from "next/headers";

type StyleWeights = {
  visual: number;
  aural: number;
  reading: number;
  kinesthetic: number;
};

const NUDGE: Record<string, Partial<StyleWeights>> = {
  video: { visual: 0.08 },
  text: { reading: 0.08 },
  podcast: { aural: 0.1 },
  quiz: { kinesthetic: 0.08 },
};

function normalize(w: StyleWeights): StyleWeights {
  const total = w.visual + w.aural + w.reading + w.kinesthetic || 1;
  return {
    visual: w.visual / total,
    aural: w.aural / total,
    reading: w.reading / total,
    kinesthetic: w.kinesthetic / total,
  };
}

export async function POST(req: Request) {
  const { type, payload } = await req.json();
  const jar = await cookies();
  const raw = jar.get("cefis_profile")?.value;
  if (!raw) {
    return NextResponse.json({ ok: false, message: "no profile" }, { status: 400 });
  }
  const profile = JSON.parse(raw);
  const weights: StyleWeights = profile.styleWeights ?? {
    visual: 0.25,
    aural: 0.25,
    reading: 0.25,
    kinesthetic: 0.25,
  };

  if (type === "format_chosen") {
    const nudge = NUDGE[payload?.kind] ?? {};
    const next = normalize({
      visual: weights.visual + (nudge.visual ?? 0),
      aural: weights.aural + (nudge.aural ?? 0),
      reading: weights.reading + (nudge.reading ?? 0),
      kinesthetic: weights.kinesthetic + (nudge.kinesthetic ?? 0),
    });
    profile.styleWeights = next;
    profile.events = [
      ...(profile.events ?? []).slice(-49),
      { type, payload, at: Date.now() },
    ];
    const res = NextResponse.json({ ok: true, styleWeights: next });
    res.cookies.set("cefis_profile", JSON.stringify(profile), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  return NextResponse.json({ ok: true });
}
