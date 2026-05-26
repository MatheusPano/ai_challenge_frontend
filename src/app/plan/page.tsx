"use client";

import { useEffect, useMemo, useState } from "react";
import { FORMAT_META } from "@/components/plan/FormatChip";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import {
  VARK_TO_KIND,
  type FormatKind,
  type FormatOption,
  type Plan,
  type Stop,
} from "@/lib/plan/types";

const SUPPORTED_KINDS: FormatKind[] = ["video", "text", "quiz"];

function sanitizePlan(plan: Plan): Plan {
  return {
    ...plan,
    stops: plan.stops.map((s) => ({
      ...s,
      formats: s.formats.filter((f) =>
        (SUPPORTED_KINDS as string[]).includes(f.kind),
      ),
    })).filter((s) => s.formats.length > 0),
  };
}

type VarkKey = "visual" | "aural" | "reading" | "kinesthetic";

type CurrentPlanResponse = {
  planId: number;
  plan: Plan;
  completions: { stopId: string; formatKind: string; createdAt: string }[];
};

function pickPrimary(
  stop: Stop,
  preferred: VarkKey,
): { primary: FormatOption; rest: FormatOption[] } {
  if (!stop.formats.length) throw new Error("Stop sem formatos");
  if (stop.kind === "review") {
    return { primary: stop.formats[0], rest: stop.formats.slice(1) };
  }
  const preferredKind = VARK_TO_KIND[preferred];
  const matches = stop.formats.filter((f) => f.kind === preferredKind);
  const primary = matches[0] ?? stop.formats[0];
  const rest = stop.formats.filter((f) => f !== primary);
  return { primary, rest };
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function courseUrl(courseId: number, courseTitle?: string): string {
  const slug = courseTitle ? slugify(courseTitle) : "";
  return slug
    ? `https://cefis.com.br/curso/${slug}/${courseId}`
    : `https://cefis.com.br/cursos/${courseId}`;
}

function dominantOf(w: Plan["styleWeights"]): VarkKey {
  return (Object.entries(w) as [VarkKey, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0][0];
}

export default function PlanPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string | undefined>>({});
  const [active, setActive] = useState<{
    stop: Stop;
    format: FormatOption;
  } | null>(null);
  const [weights, setWeights] = useState<Plan["styleWeights"] | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch("/api/plan/current");
        if (r.ok) {
          const data = (await r.json()) as CurrentPlanResponse;
          if (cancel) return;
          data.plan = sanitizePlan(data.plan);
          setPlan(data.plan);
          setPlanId(data.planId);
          setWeights(data.plan.styleWeights);
          const initialDone: Record<string, string> = {};
          data.completions.forEach((c) => {
            initialDone[c.stopId] = c.formatKind;
          });
          setDone(initialDone);
          return;
        }
        const gen = await fetch("/api/plan/generate", { method: "POST" });
        if (!gen.ok) {
          const j = await gen.json().catch(() => ({}));
          throw new Error(j.message ?? "Falha ao gerar plano.");
        }
        const data = (await gen.json()) as { planId: number; plan: Plan };
        if (cancel) return;
        data.plan = sanitizePlan(data.plan);
        setPlan(data.plan);
        setPlanId(data.planId);
        setWeights(data.plan.styleWeights);
      } catch (e) {
        if (!cancel) setError(String(e));
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  async function pickFormat(stop: Stop, format: FormatOption) {
    setDone((d) => ({ ...d, [stop.id]: format.kind }));
    setActive({ stop, format });

    const evt = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "format_chosen",
        payload: { stopId: stop.id, kind: format.kind, topic: stop.topic },
      }),
    }).catch(() => null);
    if (evt?.ok) {
      const data = await evt.json();
      if (data.styleWeights) setWeights(data.styleWeights);
    }

    if (planId) {
      fetch("/api/plan/complete-stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          stopId: stop.id,
          formatKind: format.kind,
        }),
      }).catch(() => { });
    }
  }

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-slate-900">
            Não conseguimos montar seu plano
          </h1>
          <p className="text-slate-500 mt-2 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  if (!plan || !weights) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-slate-50">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="mt-4 text-slate-500">Carregando sua trilha...</p>
      </main>
    );
  }

  const dominant = dominantOf(weights);
  const topicStops = plan.stops.filter((s) => s.kind !== "review");
  const completedCount = Object.keys(done).filter(
    (id) => done[id] !== undefined,
  ).length;
  const nextStop =
    plan.stops.find((s) => !done[s.id]) ?? plan.stops[plan.stops.length - 1];

  return (
    <main className="flex-1 bg-slate-50">
      {/* HERO — dark teal CEFIS style */}
      <section className="bg-[#0f2e36] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest text-emerald-300 font-bold flex items-center gap-2">
              🎯 Sua trilha personalizada
            </p>
            <h1 className="text-2xl sm:text-3xl font-black mt-2">
              Aprenda do seu jeito
            </h1>
            <p className="text-slate-300 mt-1 text-sm sm:text-base">
              Nível <span className="font-bold">{plan.level}</span> ·{" "}
              {topicStops.length} tópicos ·{" "}
              {plan.stops.length - topicStops.length} revisões · estilo{" "}
              <span className="font-bold text-emerald-300">{dominant}</span>
            </p>

            {/* Progress bar */}
            <div className="mt-5 max-w-md">
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                <span>Progresso</span>
                <span className="font-bold">
                  {completedCount}/{plan.stops.length}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-500"
                  style={{
                    width: `${(completedCount / plan.stops.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 mt-1">
            <Logo className="h-7 w-auto text-white" />
            <UserMenu variant="dark" />
          </div>
        </div>

        {/* Stepper timeline (mini) */}
        <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-6">
          <div className="flex items-center gap-1 overflow-x-auto">
            {plan.stops.map((s, i) => {
              const isDone = !!done[s.id];
              const isNext = s.id === nextStop.id && !isDone;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${isDone
                      ? "bg-emerald-400 border-emerald-400 text-emerald-900"
                      : isNext
                        ? "bg-white border-white text-[#0f2e36]"
                        : "bg-transparent border-white/30 text-white/50"
                      }`}
                  >
                    {s.kind === "review" ? "🚩" : isDone ? "✓" : i + 1}
                  </div>
                  {i < plan.stops.length - 1 && (
                    <div
                      className={`w-6 h-0.5 ${isDone ? "bg-emerald-400" : "bg-white/20"
                        }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
          <span>▶</span> Suas etapas
        </h2>
        <div className="space-y-4">
          {plan.stops.map((s, i) => {
            if (s.kind === "review") {
              return (
                <ReviewCard
                  key={s.id}
                  index={i}
                  stop={s}
                  done={done[s.id]}
                  onPick={(f) => pickFormat(s, f)}
                />
              );
            }
            return (
              <TopicCard
                key={s.id}
                index={i}
                stop={s}
                done={done[s.id]}
                isFinal={i === plan.stops.length - 1}
                dominant={dominant}
                onPick={(f) => pickFormat(s, f)}
                isNext={s.id === nextStop.id && !done[s.id]}
              />
            );
          })}
        </div>
      </section>

      {active && (
        <ActiveDrawer
          stop={active.stop}
          format={active.format}
          onClose={() => setActive(null)}
        />
      )}
    </main>
  );
}

/* ---------------- Topic card (CEFIS-style) ---------------- */

function TopicCard({
  index,
  stop,
  done,
  isFinal,
  dominant,
  onPick,
  isNext,
}: {
  index: number;
  stop: Stop;
  done?: string;
  isFinal: boolean;
  dominant: VarkKey;
  onPick: (f: FormatOption) => void;
  isNext: boolean;
}) {
  const { primary, rest } = useMemo(
    () => pickPrimary(stop, dominant),
    [stop, dominant],
  );
  const banner = stop.formats.find((f) => f.courseBanner)?.courseBanner;

  return (
    <article
      className={`relative rounded-2xl bg-white border overflow-hidden shadow-sm transition ${isNext ? "border-blue-400 shadow-md ring-2 ring-blue-100" : "border-slate-200"
        }`}
    >
      {isNext && (
        <span className="absolute top-3 left-3 z-10 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full">
          Próximo
        </span>
      )}
      <div className="flex flex-col sm:flex-row">
        {/* Banner */}
        <div className="sm:w-64 shrink-0 bg-slate-100 relative aspect-video sm:aspect-auto self-start sm:self-stretch flex items-center justify-center overflow-hidden">
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner}
              alt=""
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-4xl">
              {stop.kind === "topic" ? "📚" : "🚩"}
            </div>
          )}
          {primary.crcActive && primary.crcCreditHours ? (
            <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-amber-400 text-amber-950 text-xs font-black px-2 py-1 rounded-full shadow">
              🏅 {primary.crcCreditHours} CRC
            </span>
          ) : null}
        </div>

        {/* Body */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
            Etapa {index + 1}
            {isFinal && (
              <span className="ml-2 text-amber-600">· Final</span>
            )}
          </div>
          <h3 className="font-black text-slate-900 mt-1 leading-tight text-lg">
            {stop.topic}
          </h3>
          {stop.summary && (
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
              {stop.summary}
            </p>
          )}

          {/* Format chips row */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {stop.formats.filter((f) => FORMAT_META[f.kind]).map((f, fi) => {
              const m = FORMAT_META[f.kind];
              const isPicked = done === f.kind;
              const isRecommended = f === primary;
              return (
                <button
                  key={fi}
                  onClick={() => onPick(f)}
                  className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-xs font-bold transition active:scale-95 ${isRecommended
                    ? "bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    } ${isPicked ? "ring-2 ring-emerald-300" : ""}`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 ${isRecommended ? "text-blue-600" : "text-slate-400"
                      }`}
                  >
                    {m.icon}
                  </span>
                  <span>{m.name}</span>
                  {isPicked && (
                    <span className="text-emerald-600">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Primary CTA */}
          <button
            onClick={() => onPick(primary)}
            className="mt-4 w-full sm:w-auto sm:self-start inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold px-5 py-2.5 text-sm transition"
          >
            {done ? "▶ Continuar etapa" : "▶ Começar etapa"}
            <span className="text-blue-200 font-semibold text-xs">
              · {FORMAT_META[primary.kind].name}
            </span>
          </button>
          {rest.length > 0 && (
            <p className="mt-1.5 text-[11px] text-slate-400">
              Recomendado para seu estilo {dominant}. Clique em outro formato
              acima para trocar.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/* ---------------- Review checkpoint card ---------------- */

function ReviewCard({
  index,
  stop,
  done,
  onPick,
}: {
  index: number;
  stop: Stop;
  done?: string;
  onPick: (f: FormatOption) => void;
}) {
  const format = stop.formats[0];
  if (!format) return null;
  return (
    <article className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-4 sm:p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-xl shrink-0 font-black">
        🚩
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-amber-700 font-bold">
          Checkpoint #{index + 1} · Revisão
        </div>
        <h3 className="font-black text-amber-950 leading-tight mt-0.5">
          {stop.topic}
        </h3>
        {stop.summary && (
          <p className="text-sm text-amber-900/70 mt-0.5 line-clamp-1">
            {stop.summary}
          </p>
        )}
      </div>
      <button
        onClick={() => onPick(format)}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 text-sm transition active:scale-95"
      >
        {done ? "✓ Refazer" : "Fazer quiz"}
      </button>
    </article>
  );
}

/* ---------------- Drawer ---------------- */

type CourseProgress = {
  percentage?: number;
  seconds?: number;
  lessonId?: number;
  lastSecond?: number;
};

function ActiveDrawer({
  stop,
  format,
  onClose,
}: {
  stop: Stop;
  format: FormatOption;
  onClose: () => void;
}) {
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    if (format.kind !== "video" || !format.courseId) return;
    let cancel = false;
    setProgressLoading(true);
    fetch(`/api/cefis/courses/${format.courseId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (cancel) return;
        const p = res?.data?.progress;
        if (p && typeof p === "object") setProgress(p as CourseProgress);
      })
      .finally(() => !cancel && setProgressLoading(false));
    return () => {
      cancel = true;
    };
  }, [format.kind, format.courseId]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-slate-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-auto"
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400 font-bold">
              {format.kind}
            </div>
            <h2 className="text-xl font-black mt-1">{stop.topic}</h2>
            <p className="text-sm text-slate-500 mt-1">{format.label}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        {format.courseBanner && (
          <div className="relative mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={format.courseBanner}
              alt=""
              className="w-full rounded-xl"
            />
            {format.crcActive && format.crcCreditHours ? (
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-amber-400 text-amber-950 text-xs font-black px-2.5 py-1 rounded-full shadow">
                🏅 {format.crcCreditHours} pts CRC
              </span>
            ) : null}
          </div>
        )}
        {format.kind === "video" && format.courseId ? (
          <>
            {progressLoading && (
              <div className="text-xs text-slate-400 text-center mb-3">
                Buscando seu progresso...
              </div>
            )}
            {progress && typeof progress.percentage === "number" && (
              <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <div className="flex justify-between items-center text-xs font-bold text-emerald-700 mb-1">
                  <span>Seu progresso na CEFIS</span>
                  <span>{Math.round(progress.percentage)}%</span>
                </div>
                <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${Math.min(100, progress.percentage)}%` }}
                  />
                </div>
              </div>
            )}
            <a
              href={courseUrl(format.courseId, format.courseTitle)}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-center"
            >
              {progress?.percentage
                ? `Continuar (${Math.round(progress.percentage)}%)`
                : "Abrir curso na CEFIS"}{" "}
              →
            </a>
          </>
        ) : format.kind === "text" &&
          (format.courseId ??
            stop.formats.find((f) => f.kind === "video")?.courseId) ? (
          <SummaryView
            courseId={
              (format.courseId ??
                stop.formats.find((f) => f.kind === "video")?.courseId) as number
            }
            stopTopic={stop.topic}
          />
        ) : format.kind === "quiz" ? (
          <QuizView
            stop={stop}
            courseId={
              format.courseId ??
              stop.formats.find((f) => f.kind === "video")?.courseId
            }
          />
        ) : (
          <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
            🚧 Conteúdo gerado sob demanda — em construção.
            {format.prompt && (
              <div className="mt-2 text-xs text-slate-400 italic">
                Hint para geração: &ldquo;{format.prompt}&rdquo;
              </div>
            )}
          </div>
        )}
        <p className="mt-4 text-xs text-slate-400 text-center">
          Sua escolha foi registrada — o tutor está aprendendo seu estilo.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Summary (RAG) ---------------- */

type SummaryResponse = {
  courseId: number;
  courseTitle: string;
  tldr: string;
  body?: string;
  lessons: {
    lessonId: number;
    lessonTitle: string;
    position: number;
    startMs: number;
    bullets: string[];
  }[];
  available: boolean;
};

function SummaryView({
  courseId,
  stopTopic,
}: {
  courseId: number;
  stopTopic: string;
}) {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    fetch("/api/plan/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, stopTopic }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return (await r.json()) as SummaryResponse;
      })
      .then((d) => !cancel && setData(d))
      .catch((e) => !cancel && setError(String(e)))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [courseId, stopTopic]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-3 bg-slate-200 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-slate-200 rounded animate-pulse" />
        <div className="h-3 bg-slate-200 rounded animate-pulse w-5/6" />
        <div className="h-3 bg-slate-200 rounded animate-pulse w-4/6" />
        <p className="text-xs text-slate-400 text-center pt-2">
          Gerando resumo a partir das aulas... (pode levar até ~30s)
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
        Falha ao gerar resumo: {error}
      </div>
    );
  }

  if (!data?.available) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        Este curso ainda não tem transcrições indexadas. Volte em breve.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.body && (
        <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
          {data.body.split(/\n\n+/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Quiz (RAG-grounded) ---------------- */

type QuestionResponse = {
  enunciado: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
};

const QUIZ_TOTAL_QUESTIONS = 7;

function QuizView({
  stop,
  courseId,
}: {
  stop: Stop;
  courseId: number | undefined;
}) {
  const [q, setQ] = useState<QuestionResponse | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [askedTopics, setAskedTopics] = useState<string[]>([stop.topic]);
  const [finished, setFinished] = useState(false);

  async function load(nextIndex: number, topicsForApi: string[]) {
    setLoading(true);
    setError(null);
    setPicked(null);
    setQ(null);
    try {
      const r = await fetch("/api/quiz/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals: [],
          categoryIds: [],
          difficulty: "medium",
          askedTopics: topicsForApi,
          courseId,
        }),
      });
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data = (await r.json()) as QuestionResponse;
      setQ(data);
      setQuestionIndex(nextIndex);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (q && picked !== null && picked === q.correta) {
      setCorrectCount((c) => c + 1);
    }
    const newTopics = q ? [...askedTopics, q.enunciado.slice(0, 60)] : askedTopics;
    setAskedTopics(newTopics);
    if (questionIndex + 1 >= QUIZ_TOTAL_QUESTIONS) {
      if (q && picked !== null && picked === q.correta) {
        // already counted above
      }
      setFinished(true);
      return;
    }
    load(questionIndex + 1, newTopics);
  }

  function restart() {
    setFinished(false);
    setCorrectCount(0);
    setAskedTopics([stop.topic]);
    load(0, [stop.topic]);
  }

  useEffect(() => {
    load(0, [stop.topic]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (finished) {
    const total = QUIZ_TOTAL_QUESTIONS;
    const pct = Math.round((correctCount / total) * 100);
    return (
      <div className="space-y-4 text-center">
        <div className="text-5xl">{pct >= 70 ? "🎉" : pct >= 40 ? "💪" : "📚"}</div>
        <h3 className="text-xl font-black text-slate-900">
          Quiz concluído!
        </h3>
        <p className="text-slate-600">
          Você acertou <span className="font-black text-emerald-600">{correctCount}</span> de {total} ({pct}%)
        </p>
        <button
          onClick={restart}
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm"
        >
          Refazer quiz
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 bg-slate-200 rounded animate-pulse w-5/6" />
        <div className="h-9 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-9 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-9 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-9 bg-slate-100 rounded-xl animate-pulse" />
        <p className="text-xs text-slate-400 text-center pt-2">
          Gerando pergunta... (pode levar até ~30s)
        </p>
      </div>
    );
  }

  if (error || !q) {
    return (
      <div className="space-y-2">
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          Falha ao gerar pergunta: {error ?? "resposta inválida"}
        </div>
        <button
          onClick={() => load(questionIndex, askedTopics)}
          className="w-full rounded-xl bg-slate-900 text-white font-bold py-2.5 text-sm"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const revealed = picked !== null;
  const correctIdx = q.correta;
  const isCorrect = revealed && picked === correctIdx;
  const isLast = questionIndex + 1 >= QUIZ_TOTAL_QUESTIONS;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-500">
          Pergunta {questionIndex + 1} de {QUIZ_TOTAL_QUESTIONS}
        </span>
        <span className="text-slate-400">
          Acertos: <span className="font-bold text-emerald-600">{correctCount}</span>
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${((questionIndex) / QUIZ_TOTAL_QUESTIONS) * 100}%` }}
        />
      </div>
      <p className="text-base font-bold text-slate-900 leading-snug">
        {q.enunciado}
      </p>
      <div className="space-y-2">
        {q.alternativas.map((alt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === correctIdx;
          let cls =
            "w-full text-left rounded-xl border px-3 py-2.5 text-sm transition ";
          if (!revealed) {
            cls += "border-slate-200 hover:border-blue-400 hover:bg-blue-50";
          } else if (isCorrect) {
            cls += "border-emerald-400 bg-emerald-50 text-emerald-900";
          } else if (isPicked) {
            cls += "border-red-400 bg-red-50 text-red-900";
          } else {
            cls += "border-slate-200 text-slate-400";
          }
          return (
            <button
              key={i}
              disabled={revealed}
              onClick={() => setPicked(i)}
              className={cls}
            >
              <span className="inline-block w-5 font-bold">
                {String.fromCharCode(65 + i)}.
              </span>{" "}
              {alt}
              {revealed && isCorrect && (
                <span className="ml-2 text-xs font-bold">✓</span>
              )}
              {revealed && isPicked && !isCorrect && (
                <span className="ml-2 text-xs font-bold">✗</span>
              )}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div
          className={`rounded-xl border p-3 text-sm ${isCorrect
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
        >
          <div className="font-black mb-1.5 flex items-center gap-1.5">
            {isCorrect ? "✓ Mandou bem!" : "✗ Resposta incorreta"}
          </div>
          {!isCorrect && (
            <p className="text-xs leading-relaxed mb-2">
              <span className="font-bold">A resposta correta é{" "}
                {String.fromCharCode(65 + correctIdx)}:
              </span>{" "}
              {q.alternativas[correctIdx]}
            </p>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold opacity-70 mb-0.5">
              Por quê
            </div>
            <p className="text-xs leading-relaxed">{q.explicacao}</p>
          </div>
        </div>
      )}
      {revealed && (
        <button
          onClick={handleNext}
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 text-sm"
        >
          {isLast ? "Ver resultado" : "Próxima pergunta"}
        </button>
      )}
    </div>
  );
}
