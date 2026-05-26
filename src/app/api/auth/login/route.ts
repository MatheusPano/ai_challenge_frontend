import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function POST(req: Request) {
  const { email, pass } = await req.json();

  if (!email || !pass) {
    return NextResponse.json(
      { message: "Informe e-mail/CPF e senha." },
      { status: 400 },
    );
  }

  const upstream = await fetch("https://cefis.com.br/api/v1/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, pass }),
    cache: "no-store",
  });

  const body = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return NextResponse.json(
      { message: body?.message ?? "Falha no login." },
      { status: upstream.status },
    );
  }

  const key = body?.data?.key as string | undefined;
  const user = body?.data?.user as
    | { id: number; name: string; first_name?: string; email: string; avatar?: string }
    | undefined;

  if (!key || !user) {
    return NextResponse.json(
      { message: "Resposta inesperada do servidor." },
      { status: 502 },
    );
  }

  // Persist user identity on backend so plans/events link to a known person.
  // Awaited so the profile is committed before the client checks /plan/current.
  try {
    await fetch(`${BACKEND_URL}/api/profile/identify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        cefisUserId: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar ?? null,
      }),
    });
  } catch (e) {
    console.error("identify failed (non-fatal)", e);
  }

  const res = NextResponse.json({ user });
  res.cookies.set("cefis_key", key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  // Non-httpOnly so the client can read for UI (name/avatar).
  res.cookies.set(
    "cefis_user",
    JSON.stringify({
      id: user.id,
      name: user.name,
      firstName: user.first_name ?? user.name.split(" ")[0],
      email: user.email,
      avatar: user.avatar ?? null,
    }),
    {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  );
  return res;
}
