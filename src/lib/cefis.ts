import { cookies } from "next/headers";

const V3 = "https://api-v3.cefis.com.br";

export async function cefisV3<T>(path: string): Promise<T> {
  const key = (await cookies()).get("cefis_key")?.value;
  if (!key) throw new Error("Não autenticado.");
  const r = await fetch(`${V3}${path}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`CEFIS v3 ${path} → ${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json() as Promise<T>;
}

export type CefisCourse = {
  id: number;
  title: string;
  subtitle?: string;
  summary?: string;
  goals?: string[];
  banner?: string;
  duration?: number;
  lessonCount?: number;
  averageRating?: number;
  categories?: number[];
  teacher?: { id: number; name: string; avatar?: string };
  keywords?: string;
};

export async function listCoursesByCategories(
  categoryIds: number[],
  count = 12,
): Promise<CefisCourse[]> {
  if (!categoryIds.length) return [];
  const qs = new URLSearchParams();
  qs.set("count", String(count));
  qs.set("order", "averageRating");
  qs.set("orderDirection", "desc");
  categoryIds.forEach((id) => qs.append("categories[]", String(id)));
  const data = await cefisV3<{ data: CefisCourse[] }>(`/courses?${qs}`);
  return data.data ?? [];
}
