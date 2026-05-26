import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function backend<T>(
  path: string,
  init: RequestInit & { authRequired?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.authRequired !== false) {
    const key = (await cookies()).get("cefis_key")?.value;
    if (!key) throw new Error("Não autenticado.");
    headers.Authorization = `Bearer ${key}`;
  }
  const r = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`backend ${path} → ${r.status}: ${txt.slice(0, 200)}`);
  }
  return r.json() as Promise<T>;
}
