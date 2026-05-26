import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listCoursesByCategories, type CefisCourse } from "@/lib/cefis";
import { CATEGORIES } from "@/lib/onboarding/types";
import type { Plan, Stop } from "@/lib/plan/types";

type Profile = {
  goals: string[];
  categoryIds: number[];
  level: string;
  theta: number;
  topicSignals?: { topico: string; correct: boolean; difficulty: string }[];
  styleWeights?: {
    visual: number;
    aural: number;
    reading: number;
    kinesthetic: number;
  };
};

const SCHEMA = {
  type: "object",
  properties: {
    stops: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          summary: { type: "string" },
          formats: {
            type: "array",
            items: {
              type: "object",
              properties: {
                kind: {
                  type: "string",
                  enum: ["video", "text", "podcast", "quiz"],
                },
                label: { type: "string" },
                estimatedMinutes: { type: "integer" },
                courseId: { type: "integer" },
                quizScope: { type: "string", enum: ["review", "topic"] },
                prompt: { type: "string" },
              },
              required: ["kind", "label", "estimatedMinutes"],
            },
          },
        },
        required: ["topic", "summary", "formats"],
      },
    },
  },
  required: ["stops"],
};

const GOAL_LABELS: Record<string, string> = {
  carreira: "evoluir na carreira",
  crc: "acumular pontos CRC",
  concurso: "passar em concurso",
  conhecimento: "ampliar conhecimento geral",
};

const DEFAULT_WEIGHTS = {
  visual: 0.25,
  aural: 0.25,
  reading: 0.25,
  kinesthetic: 0.25,
};

function fallbackPlan(profile: Profile, courses: CefisCourse[]): Plan {
  const stops: Stop[] = courses.slice(0, 5).map((c, i) => ({
    id: `s-${i}`,
    topic: c.title,
    summary: c.subtitle ?? c.summary?.slice(0, 140) ?? "",
    formats: [
      {
        kind: "video",
        label: "Aula CEFIS",
        estimatedMinutes: Math.min(40, Math.round((c.duration ?? 1200) / 60)),
        courseId: c.id,
        courseBanner: c.banner,
        courseTitle: c.title,
      },
      {
        kind: "text",
        label: "Resumo escrito",
        estimatedMinutes: 6,
        prompt: `Resumo conciso sobre: ${c.title}`,
      },
      {
        kind: "podcast",
        label: "Podcast 5min",
        estimatedMinutes: 5,
        prompt: `Áudio estilo podcast sobre: ${c.title}`,
      },
      {
        kind: "quiz",
        label: "Quiz rápido",
        estimatedMinutes: 4,
        quizScope: "topic",
      },
    ],
  }));
  return {
    generatedAt: new Date().toISOString(),
    level: profile.level,
    stops,
    styleWeights: profile.styleWeights ?? DEFAULT_WEIGHTS,
  };
}

export async function POST() {
  const profile = JSON.parse(
    (await cookies()).get("cefis_profile")?.value ?? "null",
  ) as Profile | null;

  if (!profile) {
    return NextResponse.json(
      { message: "Onboarding não concluído." },
      { status: 400 },
    );
  }

  let courses: CefisCourse[] = [];
  try {
    courses = await listCoursesByCategories(profile.categoryIds, 15);
  } catch (e) {
    console.error("CEFIS courses fetch failed", e);
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key || courses.length === 0) {
    return NextResponse.json(fallbackPlan(profile, courses));
  }

  const catNames = CATEGORIES.filter((c) =>
    profile.categoryIds.includes(c.id),
  )
    .map((c) => c.name)
    .join(", ");
  const goalNames = profile.goals.map((g) => GOAL_LABELS[g] ?? g).join("; ");
  const style = profile.styleWeights ?? {
    visual: 0.25,
    aural: 0.25,
    reading: 0.25,
    kinesthetic: 0.25,
  };
  const entries = Object.entries(style) as [keyof typeof style, number][];
  const top = entries.sort((a, b) => b[1] - a[1])[0][0];
  const STYLE_LABEL: Record<typeof top, string> = {
    visual: "visual (gráficos, vídeos, diagramas)",
    aural: "auditivo (áudio, podcast, voz)",
    reading: "leitura/escrita (texto, resumos)",
    kinesthetic: "cinestésico (prática, exercícios, quiz)",
  };
  const dominantStyle = STYLE_LABEL[top];

  const courseList = courses
    .slice(0, 10)
    .map(
      (c) =>
        `- [id ${c.id}] ${c.title}${c.subtitle ? " — " + c.subtitle : ""} (${Math.round(
          (c.duration ?? 0) / 60,
        )}min, nota ${c.averageRating ?? "?"})\n  Resumo: ${c.summary?.slice(0, 220) ?? "—"}\n  Objetivos: ${(c.goals ?? []).join(" | ").slice(0, 220)}`,
    )
    .join("\n");

  const prompt = `Você é um tutor de aprendizado da CEFIS. Monte uma TRILHA DE ESTUDOS personalizada.

Perfil do aluno:
- Objetivos: ${goalNames}
- Áreas: ${catNames}
- Nível: ${profile.level} (θ=${profile.theta.toFixed(2)})
- Estilo dominante atual: ${dominantStyle}

Cursos disponíveis no catálogo:
${courseList}

Regras:
- Crie 6 a 8 STOPS (paradas), cada uma representando um TÓPICO/CONCEITO específico (não um curso inteiro). Ordene do mais básico ao mais avançado para o nível ${profile.level}.
- Para cada stop, ofereça 2 a 4 FORMATOS diferentes de aprender o MESMO tópico. O aluno escolhe.
- Tipos de formato:
  - "video": referencie um curso real do catálogo via "courseId" (use IDs reais da lista acima); label = "Aula CEFIS" ou parte específica.
  - "text": resumo/apostila gerado pela IA; em "prompt" descreva o que gerar (1 frase).
  - "podcast": áudio explicativo; "prompt" com tema do podcast.
  - "quiz": teste de fixação; quizScope="topic" para o tópico atual, "review" para revisar stops anteriores.
- Cada stop DEVE ter pelo menos um "video" se houver curso adequado no catálogo, mais 1 ou 2 outros formatos alternativos.
- "estimatedMinutes" entre 5 e 30 por formato.
- Pelo menos um stop perto do meio deve incluir um "quiz" com scope="review".
- O último stop deve ser um quiz geral de revisão.
- Pondere a OFERTA de formatos pelo estilo dominante (${dominantStyle}): visual → priorize video; auditivo → priorize podcast; leitura → priorize text; cinestésico → priorize quiz. Mas SEMPRE ofereça pelo menos 2 alternativas para o aluno escolher.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: SCHEMA,
          temperature: 0.7,
        },
      }),
      cache: "no-store",
    });
    if (!r.ok) {
      console.error("Gemini plan error", await r.text());
      return NextResponse.json(fallbackPlan(profile, courses));
    }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(text);
    const courseMap = new Map(courses.map((c) => [c.id, c]));
    const stops: Stop[] = (parsed.stops as Array<{
      topic: string;
      summary: string;
      formats: Array<{
        kind: string;
        label: string;
        estimatedMinutes?: number;
        courseId?: number;
        quizScope?: string;
        prompt?: string;
      }>;
    }>).map((s, i) => ({
      id: `s-${i}`,
      topic: s.topic,
      summary: s.summary,
      formats: (s.formats ?? []).map((f) => {
        const course = f.courseId ? courseMap.get(f.courseId) : undefined;
        return {
          kind: f.kind as "video" | "text" | "podcast" | "quiz",
          label: f.label,
          estimatedMinutes: Math.max(3, Math.min(40, f.estimatedMinutes ?? 10)),
          courseId: f.courseId,
          courseBanner: course?.banner,
          courseTitle: course?.title,
          quizScope: f.quizScope as "review" | "topic" | undefined,
          prompt: f.prompt,
        };
      }),
    }));

    const plan: Plan = {
      generatedAt: new Date().toISOString(),
      level: profile.level,
      stops,
      styleWeights: profile.styleWeights ?? DEFAULT_WEIGHTS,
    };
    return NextResponse.json(plan);
  } catch (e) {
    console.error("Gemini plan exception", e);
    return NextResponse.json(fallbackPlan(profile, courses));
  }
}
