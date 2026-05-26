"use client";

import { useEffect, useMemo, useState } from "react";
import { FORMAT_META } from "@/components/plan/FormatChip";
import {
  VARK_TO_KIND,
  type FormatOption,
  type Plan,
  type Stop,
} from "@/lib/plan/types";

type VarkKey = "visual" | "aural" | "reading" | "kinesthetic";

function pickPrimary(
  stop: Stop,
  preferred: VarkKey,
): { primary: FormatOption; rest: FormatOption[] } {
  if (!stop.formats.length) {
    throw new Error("Stop sem formatos");
  }
  const preferredKind = VARK_TO_KIND[preferred];
  const matches = stop.formats.filter((f) => f.kind === preferredKind);
  const primary = matches[0] ?? stop.formats[0];
  const rest = stop.formats.filter((f) => f !== primary);
  return { primary, rest };
}

function dominantOf(w: Plan["styleWeights"]): VarkKey {
  return (Object.entries(w) as [VarkKey, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0][0];
}

export default function PlanPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [done, setDone] = useState<Record<string, string | undefined>>({});
  const [active, setActive] = useState<{
    stop: Stop;
    format: FormatOption;
  } | null>(null);
  const [weights, setWeights] = useState<Plan["styleWeights"] | null>(null);

  useEffect(() => {
    fetch("/api/plan/generate", { method: "POST" })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.message ?? "Falha ao gerar plano.");
        }
        return r.json() as Promise<Plan>;
      })
      .then((p) => {
        setPlan(p);
        setWeights(p.styleWeights);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!plan) return;
    setRevealed(0);
    let i = 0;
    const tick = () => {
      i += 1;
      setRevealed(i);
      if (i < plan.stops.length) setTimeout(tick, 380);
    };
    setTimeout(tick, 250);
  }, [plan]);

  async function pickFormat(stop: Stop, format: FormatOption) {
    setDone((d) => ({ ...d, [stop.id]: format.kind }));
    setActive({ stop, format });
    const r = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "format_chosen",
        payload: { stopId: stop.id, kind: format.kind, topic: stop.topic },
      }),
    }).catch(() => null);
    if (r?.ok) {
      const data = await r.json();
      if (data.styleWeights) setWeights(data.styleWeights);
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
      <main className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="mt-4 text-slate-500">Montando sua trilha...</p>
      </main>
    );
  }

  const dominant = dominantOf(weights);

  return (
    <main className="flex-1 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
      <header className="max-w-3xl mx-auto px-4 sm:px-8 pt-10 pb-6">
        <p className="text-xs uppercase tracking-widest text-indigo-300 font-bold">
          Sua trilha
        </p>
        <h1 className="text-3xl sm:text-4xl font-black mt-2">
          Aprenda do seu jeito
        </h1>
        <p className="text-slate-300 mt-2">
          Nível {plan.level} · {plan.stops.length} paradas · escolhemos seu
          formato favorito (
          <span className="text-indigo-300 font-semibold">{dominant}</span>
          ), mas você pode trocar a qualquer hora.
        </p>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 pb-24">
        <Trail
          stops={plan.stops}
          revealed={revealed}
          done={done}
          dominant={dominant}
          onPick={pickFormat}
        />
      </div>

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

function Trail({
  stops,
  revealed,
  done,
  dominant,
  onPick,
}: {
  stops: Stop[];
  revealed: number;
  done: Record<string, string | undefined>;
  dominant: VarkKey;
  onPick: (s: Stop, f: FormatOption) => void;
}) {
  return (
    <div className="relative">
      <div
        className="absolute left-1/2 top-4 bottom-4 -translate-x-1/2 w-0 border-l-2 border-dashed border-white/15"
        aria-hidden
      />
      <div className="relative flex flex-col gap-8">
        {stops.map((s, i) => {
          const side: "left" | "right" = i % 2 === 0 ? "left" : "right";
          const visible = i < revealed;
          const isDone = !!done[s.id];
          const isLatest = i === revealed - 1 && !isDone;
          return (
            <div
              key={s.id}
              className={`flex ${side === "left" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`relative w-full sm:w-[460px] transition-all duration-500 ${
                  visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6 pointer-events-none"
                }`}
              >
                <StopCard
                  index={i}
                  stop={s}
                  done={done[s.id]}
                  isFinal={i === stops.length - 1}
                  dominant={dominant}
                  onPick={(f) => onPick(s, f)}
                  isLatest={isLatest}
                />
                <span
                  className={`hidden sm:flex absolute top-4 w-9 h-9 rounded-full bg-slate-800 border-4 border-slate-900 items-center justify-center text-xs font-black ${
                    isDone ? "text-emerald-400" : "text-indigo-300"
                  } ${side === "left" ? "-right-12" : "-left-12"}`}
                >
                  {isDone ? "✓" : i + 1}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StopCard({
  index,
  stop,
  done,
  isFinal,
  dominant,
  onPick,
  isLatest,
}: {
  index: number;
  stop: Stop;
  done?: string;
  isFinal: boolean;
  dominant: VarkKey;
  onPick: (f: FormatOption) => void;
  isLatest: boolean;
}) {
  const { primary, rest } = useMemo(
    () => pickPrimary(stop, dominant),
    [stop, dominant],
  );
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-2xl bg-slate-800/90 border border-slate-700 backdrop-blur p-4 shadow-xl ${
        isLatest ? "ring-2 ring-indigo-400/60" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
        Parada {index + 1}
        {isFinal && <span className="text-amber-300">· final</span>}
      </div>
      <h3 className="font-black text-white mt-1 leading-tight">{stop.topic}</h3>
      {stop.summary && (
        <p className="text-sm text-slate-300 mt-1 line-clamp-2">
          {stop.summary}
        </p>
      )}

      <PrimaryFormatButton
        format={primary}
        done={done === primary.kind}
        onClick={() => onPick(primary)}
      />

      {rest.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-slate-400 hover:text-slate-200 font-semibold inline-flex items-center gap-1 transition"
          >
            <span>
              {expanded
                ? "Esconder outras opções"
                : `Outras formas de aprender (${rest.length})`}
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div
            className={`grid transition-all duration-300 ${
              expanded
                ? "grid-rows-[1fr] opacity-100 mt-2"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-wrap gap-2 pt-1">
                {rest.map((f, fi) => (
                  <SecondaryFormatChip
                    key={fi}
                    format={f}
                    done={done === f.kind}
                    onClick={() => onPick(f)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PrimaryFormatButton({
  format,
  done,
  onClick,
}: {
  format: FormatOption;
  done: boolean;
  onClick: () => void;
}) {
  const m = FORMAT_META[format.kind];
  return (
    <button
      onClick={onClick}
      className={`mt-4 w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition active:scale-[0.98] ${m.color}`}
    >
      <span className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
        {m.icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[10px] uppercase tracking-wider font-bold opacity-80">
          {m.name} recomendado · {format.estimatedMinutes}min
        </span>
        <span className="block font-bold truncate">{format.label}</span>
      </span>
      {done ? (
        <span className="w-7 h-7 rounded-full bg-white text-emerald-600 flex items-center justify-center font-black">
          ✓
        </span>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="w-5 h-5 opacity-80"
        >
          <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function SecondaryFormatChip({
  format,
  done,
  onClick,
}: {
  format: FormatOption;
  done: boolean;
  onClick: () => void;
}) {
  const m = FORMAT_META[format.kind];
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${m.color} ${done ? "opacity-60" : ""}`}
    >
      <span className="inline-flex items-center justify-center w-5 h-5">
        {m.icon}
      </span>
      <span>{format.label}</span>
      <span className="opacity-70 font-semibold">·{format.estimatedMinutes}m</span>
      {done && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-emerald-600 flex items-center justify-center text-[10px] font-black">
          ✓
        </span>
      )}
    </button>
  );
}

function ActiveDrawer({
  stop,
  format,
  onClose,
}: {
  stop: Stop;
  format: FormatOption;
  onClose: () => void;
}) {
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
              {format.kind} · {format.estimatedMinutes}min
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={format.courseBanner}
            alt=""
            className="w-full rounded-xl mb-4"
          />
        )}
        {format.kind === "video" && format.courseId ? (
          <a
            href={`https://cefis.com.br/curso/${format.courseId}`}
            target="_blank"
            rel="noreferrer"
            className="block w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 text-center"
          >
            Abrir curso na CEFIS →
          </a>
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
          Sua escolha foi registrada — o tutor está aprendendo seu estilo
          preferido.
        </p>
      </div>
    </div>
  );
}
