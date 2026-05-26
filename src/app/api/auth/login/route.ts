import { NextResponse } from "next/server";

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
  const user = body?.data?.user;

  if (!key) {
    return NextResponse.json(
      { message: "Resposta inesperada do servidor." },
      { status: 502 },
    );
  }

  const res = NextResponse.json({ user });
  res.cookies.set("cefis_key", key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
