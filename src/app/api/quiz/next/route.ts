import { NextResponse } from "next/server";
import { CATEGORIES, type Difficulty, type Question } from "@/lib/onboarding/types";

type Body = {
  goals: string[];
  categoryIds: number[];
  difficulty: Difficulty;
  askedTopics: string[];
};

const GOAL_LABELS: Record<string, string> = {
  carreira: "evoluir na carreira (habilidades profissionais)",
  crc: "acumular pontos CRC (créditos para o conselho)",
  concurso: "passar em concurso público / certificação",
  conhecimento: "ampliar conhecimento geral por curiosidade",
};

const SCHEMA = {
  type: "object",
  properties: {
    enunciado: { type: "string" },
    alternativas: {
      type: "array",
      items: { type: "string" },
      minItems: 4,
      maxItems: 4,
    },
    correta: { type: "integer", minimum: 0, maximum: 3 },
    topico: { type: "string" },
    explicacao: { type: "string" },
  },
  required: ["enunciado", "alternativas", "correta", "topico", "explicacao"],
};

function mockQuestion(b: Body): Question {
  const cat =
    CATEGORIES.find((c) => b.categoryIds?.includes(c.id))?.name ??
    "Contabilidade";
  return {
    id: `mock-${Date.now()}`,
    enunciado: `[MOCK ${b.difficulty}] Questão genérica de ${cat} — defina GEMINI_API_KEY no .env.local para questões reais.`,
    alternativas: [
      "Alternativa A (correta)",
      "Alternativa B",
      "Alternativa C",
      "Alternativa D",
    ],
    correta: 0,
    dificuldade: b.difficulty,
    topico: cat,
    explicacao: "Esta é uma questão de exemplo (sem chave Gemini).",
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return NextResponse.json(mockQuestion(body));
  }

  const cat =
    CATEGORIES.filter((c) => body.categoryIds?.includes(c.id))
      .map((c) => c.name)
      .join(", ") || "geral";
  const goalText =
    body.goals?.map((g) => GOAL_LABELS[g] ?? g).join("; ") || "geral";

  const prompt = `Gere UMA questão de múltipla escolha em português brasileiro para avaliar conhecimento.

Contexto do aluno:
- Objetivos: ${goalText}
- Áreas: ${cat}
- Dificuldade desejada: ${body.difficulty} (easy=conceito básico, medium=aplicação, hard=análise/caso)
${body.askedTopics.length ? `- Evite estes tópicos já cobertos: ${body.askedTopics.join(", ")}` : ""}

Regras:
- Enunciado claro, máximo 3 frases
- 4 alternativas plausíveis, apenas UMA correta
- "correta" é o índice (0-3) da alternativa correta
- "topico" é um sub-tópico específico de ${cat}
- "explicacao" justifica a resposta correta em 1 frase`;

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
      console.error("Gemini error", await r.text());
      return NextResponse.json(mockQuestion(body));
    }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return NextResponse.json(mockQuestion(body));
    const parsed = JSON.parse(text);
    const q: Question = {
      id: `q-${Date.now()}`,
      enunciado: parsed.enunciado,
      alternativas: parsed.alternativas,
      correta: parsed.correta,
      dificuldade: body.difficulty,
      topico: parsed.topico,
      explicacao: parsed.explicacao,
    };
    return NextResponse.json(q);
  } catch (e) {
    console.error(e);
    return NextResponse.json(mockQuestion(body));
  }
}
