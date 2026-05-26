"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell, PrimaryButton, OptionCard } from "@/components/onboarding/Shell";
import { Icon } from "@/components/onboarding/Icon";
import {
  CATEGORIES,
  GOALS,
  type Goal,
  type OnboardingState,
  type Question,
  type QuizResponse,
} from "@/lib/onboarding/types";
import {
  VARK_QUESTIONS,
  scoreVark,
  type VarkKey,
} from "@/lib/onboarding/vark";
import {
  MAX_QUESTIONS,
  isFinished,
  nextDifficulty,
  thetaToLevel,
  updateTheta,
} from "@/lib/onboarding/cat";

const TOTAL_STEPS = 5;

type Action =
  | { type: "next" }
  | { type: "back" }
  | { type: "toggle_goal"; goal: Goal }
  | { type: "toggle_category"; id: number }
  | { type: "answer_vark"; questionId: string; key: VarkKey }
  | { type: "set_current_question"; q: Question }
  | { type: "clear_current_question" }
  | { type: "answer"; response: QuizResponse };

const initial: OnboardingState = {
  step: 1,
  goals: [],
  categoryIds: [],
  vark: {},
  quiz: { theta: 0.5, responses: [] },
};

function reducer(s: OnboardingState, a: Action): OnboardingState {
  switch (a.type) {
    case "next":
      return { ...s, step: Math.min(TOTAL_STEPS, s.step + 1) };
    case "back":
      return { ...s, step: Math.max(1, s.step - 1) };
    case "toggle_goal": {
      const has = s.goals.includes(a.goal);
      return {
        ...s,
        goals: has ? s.goals.filter((g) => g !== a.goal) : [...s.goals, a.goal],
      };
    }
    case "answer_vark":
      return { ...s, vark: { ...s.vark, [a.questionId]: a.key } };
    case "toggle_category": {
      const has = s.categoryIds.includes(a.id);
      return {
        ...s,
        categoryIds: has
          ? s.categoryIds.filter((c) => c !== a.id)
          : [...s.categoryIds, a.id],
      };
    }
    case "set_current_question":
      return { ...s, quiz: { ...s.quiz, current: a.q } };
    case "clear_current_question":
      return { ...s, quiz: { ...s.quiz, current: undefined } };
    case "answer": {
      const responses = [...s.quiz.responses, a.response];
      const theta = updateTheta(s.quiz.theta, a.response);
      return {
        ...s,
        quiz: { theta, responses, current: undefined },
      };
    }
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initial);
  const back = state.step > 1 ? () => dispatch({ type: "back" }) : undefined;

  return (
    <>
      {state.step === 1 && <StepGoal state={state} dispatch={dispatch} />}
      {state.step === 2 && (
        <StepCategory state={state} dispatch={dispatch} onBack={back} />
      )}
      {state.step === 3 && (
        <StepVark state={state} dispatch={dispatch} onBack={back} />
      )}
      {state.step === 4 && (
        <StepQuiz state={state} dispatch={dispatch} onBack={back} />
      )}
      {state.step === 5 && <StepFinalize state={state} router={router} />}
    </>
  );
}

/* ---------------- Step 1: Goals (multi-select) ---------------- */

function StepGoal({
  state,
  dispatch,
}: {
  state: OnboardingState;
  dispatch: React.Dispatch<Action>;
}) {
  const canNext = state.goals.length > 0;

  return (
    <Shell
      step={1}
      total={TOTAL_STEPS}
      title="Seus Objetivos"
      subtitle="O que você quer alcançar? Selecione um ou mais."
      footer={
        <PrimaryButton
          disabled={!canNext}
          onClick={() => dispatch({ type: "next" })}
        >
          Continuar
        </PrimaryButton>
      }
    >
      <div className="space-y-3">
        {GOALS.map((g) => {
          const selected = state.goals.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => dispatch({ type: "toggle_goal", goal: g.id })}
              className={`w-full flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition ${
                selected
                  ? "border-indigo-600 bg-indigo-50/60 shadow-md shadow-indigo-100"
                  : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20"
              }`}
            >
              <span
                className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition ${
                  selected
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Icon name={g.icon} className="w-6 h-6" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-slate-900">
                  {g.title}
                </span>
                <span className="block text-sm text-slate-500">
                  {g.description}
                </span>
              </span>
              <span
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition ${
                  selected
                    ? "bg-indigo-600 text-white"
                    : "border-2 border-slate-200"
                }`}
                aria-hidden
              >
                {selected && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

/* ---------------- Step 2: Category ---------------- */

function StepCategory({
  state,
  dispatch,
  onBack,
}: {
  state: OnboardingState;
  dispatch: React.Dispatch<Action>;
  onBack?: () => void;
}) {
  return (
    <Shell
      step={2}
      total={TOTAL_STEPS}
      onBack={onBack}
      title="Em quais áreas você quer estudar?"
      subtitle="Pode escolher mais de uma."
      footer={
        <PrimaryButton
          disabled={state.categoryIds.length === 0}
          onClick={() => dispatch({ type: "next" })}
        >
          Continuar
        </PrimaryButton>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CATEGORIES.map((c) => (
          <OptionCard
            key={c.id}
            selected={state.categoryIds.includes(c.id)}
            onClick={() => dispatch({ type: "toggle_category", id: c.id })}
            className="text-center !py-6"
          >
            <div className="text-3xl mb-1">{c.emoji}</div>
            <div className="text-sm">{c.name}</div>
          </OptionCard>
        ))}
      </div>
    </Shell>
  );
}

/* ---------------- Step 3: VARK ---------------- */

function StepVark({
  state,
  dispatch,
  onBack,
}: {
  state: OnboardingState;
  dispatch: React.Dispatch<Action>;
  onBack?: () => void;
}) {
  const [idx, setIdx] = useState(() => {
    // resume on first unanswered
    const first = VARK_QUESTIONS.findIndex((q) => !state.vark[q.id]);
    return first === -1 ? VARK_QUESTIONS.length - 1 : first;
  });
  const safeIdx = Math.min(idx, VARK_QUESTIONS.length - 1);
  const q = VARK_QUESTIONS[safeIdx];
  const selected = state.vark[q.id];
  const isLast = safeIdx === VARK_QUESTIONS.length - 1;

  function choose(key: VarkKey) {
    dispatch({ type: "answer_vark", questionId: q.id, key });
    if (!isLast) {
      setTimeout(
        () =>
          setIdx((i) => Math.min(i + 1, VARK_QUESTIONS.length - 1)),
        180,
      );
    }
  }

  function handleNext() {
    if (isLast) dispatch({ type: "next" });
  }

  function handleBack() {
    if (idx === 0) onBack?.();
    else setIdx((i) => i - 1);
  }

  return (
    <Shell
      step={3}
      total={TOTAL_STEPS}
      onBack={handleBack}
      title="Como você aprende melhor?"
      subtitle={`Pergunta ${idx + 1} de ${VARK_QUESTIONS.length} — escolha a opção que mais combina com você.`}
      footer={
        isLast ? (
          <PrimaryButton disabled={!selected} onClick={handleNext}>
            Continuar
          </PrimaryButton>
        ) : undefined
      }
    >
      <p className="text-lg text-slate-900 font-semibold mb-6">{q.prompt}</p>
      <div className="space-y-3">
        {q.options.map((opt, i) => (
          <OptionCard
            key={i}
            selected={selected === opt.key}
            onClick={() => choose(opt.key)}
          >
            <span className="inline-block w-7 h-7 mr-3 rounded-full bg-slate-100 text-slate-600 text-center text-sm font-bold leading-7">
              {String.fromCharCode(65 + i)}
            </span>
            {opt.label}
          </OptionCard>
        ))}
      </div>
    </Shell>
  );
}

/* ---------------- Step 4: CAT Quiz ---------------- */

type Difficulty = "easy" | "medium" | "hard";

async function fetchQuestion(args: {
  goals: string[];
  categoryIds: number[];
  difficulty: Difficulty;
  askedTopics: string[];
  signal?: AbortSignal;
  maxAttempts?: number;
}): Promise<Question> {
  const maxAttempts = args.maxAttempts ?? 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const r = await fetch("/api/quiz/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: args.signal,
        body: JSON.stringify({
          goals: args.goals,
          categoryIds: args.categoryIds,
          difficulty: args.difficulty,
          askedTopics: args.askedTopics,
        }),
      });
      if (!r.ok) throw new Error(`status ${r.status}`);
      return (await r.json()) as Question;
    } catch (e) {
      lastErr = e;
      if (args.signal?.aborted) throw e;
      if (attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, 400 * attempt));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("fetch failed");
}

function StepQuiz({
  state,
  dispatch,
  onBack,
}: {
  state: OnboardingState;
  dispatch: React.Dispatch<Action>;
  onBack?: () => void;
}) {
  const { responses, theta, current } = state.quiz;
  const [picked, setPicked] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // prefetched holds the question for the predicted-next difficulty.
  const prefetchRef = useRef<{
    difficulty: Difficulty;
    promise: Promise<Question>;
  } | null>(null);

  // Auto-advance when quiz is done
  useEffect(() => {
    if (isFinished(responses)) {
      dispatch({ type: "next" });
    }
  }, [responses, dispatch]);

  // Load current question — uses prefetched if difficulty matches.
  useEffect(() => {
    if (current) return;
    if (isFinished(responses)) return;
    let cancel = false;
    const controller = new AbortController();
    const desired = nextDifficulty(theta);
    const askedTopics = responses.map((r) => r.question.topico);

    const load = async () => {
      setLoading(true);
      setError(null);
      setPicked(null);
      try {
        let q: Question;
        const cached = prefetchRef.current;
        if (cached && cached.difficulty === desired) {
          prefetchRef.current = null;
          q = await cached.promise;
        } else {
          prefetchRef.current = null;
          q = await fetchQuestion({
            goals: state.goals,
            categoryIds: state.categoryIds,
            difficulty: desired,
            askedTopics,
            signal: controller.signal,
          });
        }
        if (cancel) return;
        dispatch({ type: "set_current_question", q });
        setStartedAt(Date.now());
      } catch (e) {
        if (cancel) return;
        setError((e as Error).message ?? "Falha ao carregar questão");
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    void load();
    return () => {
      cancel = true;
      controller.abort();
    };
  }, [current, responses, theta, state.goals, state.categoryIds, dispatch]);

  // Background prefetch: while the user reads/answers the current question,
  // fetch the most likely next one. Picks the difficulty that would result
  // from a correct answer (slightly biased optimistic — corrects fast at edges).
  useEffect(() => {
    if (!current || picked !== null) return; // don't prefetch after they pick (we'll know real next)
    if (responses.length + 1 >= MAX_QUESTIONS) return;

    const optimisticTheta = updateTheta(theta, {
      question: current,
      picked: current.correta,
      correct: true,
      latencyMs: 0,
    });
    const predictedDifficulty = nextDifficulty(optimisticTheta);

    if (prefetchRef.current?.difficulty === predictedDifficulty) return;

    const askedTopics = [
      ...responses.map((r) => r.question.topico),
      current.topico,
    ];
    const promise = fetchQuestion({
      goals: state.goals,
      categoryIds: state.categoryIds,
      difficulty: predictedDifficulty,
      askedTopics,
    }).catch(() => {
      // swallow — main loader will retry if needed
      prefetchRef.current = null;
      throw new Error("prefetch failed");
    });
    prefetchRef.current = { difficulty: predictedDifficulty, promise };
  }, [current, picked, theta, responses, state.goals, state.categoryIds]);

  function submit() {
    if (picked === null || !current) return;
    dispatch({
      type: "answer",
      response: {
        question: current,
        picked,
        correct: picked === current.correta,
        latencyMs: Date.now() - startedAt,
      },
    });
  }

  const showFeedback = picked !== null && current && false; // immediate next; toggle if you want inline feedback

  return (
    <Shell
      step={4}
      total={TOTAL_STEPS}
      onBack={onBack}
      title={`Quiz adaptativo`}
      subtitle={`Questão ${responses.length + 1} de até ${MAX_QUESTIONS} — vamos calibrar seu nível.`}
      footer={
        <PrimaryButton
          disabled={picked === null || loading}
          onClick={submit}
        >
          Responder
        </PrimaryButton>
      }
    >
      {error && !current ? (
        <div className="text-center py-12">
          <p className="text-rose-600 font-semibold">{error}</p>
          <button
            onClick={() => {
              setError(null);
              dispatch({ type: "clear_current_question" });
            }}
            className="mt-4 text-sm font-bold text-indigo-600 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : loading || !current ? (
        <div className="text-center py-12 text-slate-500">
          <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-4">Preparando sua próxima questão...</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
                current.dificuldade === "easy"
                  ? "bg-emerald-100 text-emerald-700"
                  : current.dificuldade === "medium"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
              }`}
            >
              {current.dificuldade === "easy"
                ? "Fácil"
                : current.dificuldade === "medium"
                  ? "Média"
                  : "Difícil"}
            </span>
            <span className="text-xs text-slate-400">{current.topico}</span>
          </div>
          <p className="text-lg text-slate-900 font-semibold mb-6">
            {current.enunciado}
          </p>
          <div className="space-y-3">
            {current.alternativas.map((a, i) => (
              <OptionCard
                key={i}
                selected={picked === i}
                onClick={() => setPicked(i)}
              >
                <span className="inline-block w-7 h-7 mr-3 rounded-full bg-slate-100 text-slate-600 text-center text-sm font-bold leading-7">
                  {String.fromCharCode(65 + i)}
                </span>
                {a}
              </OptionCard>
            ))}
          </div>
          {showFeedback && (
            <div className="mt-4 text-sm">{current.explicacao}</div>
          )}
        </div>
      )}
    </Shell>
  );
}

/* ---------------- Step 5: Finalize ---------------- */

function StepFinalize({
  state,
  router,
}: {
  state: OnboardingState;
  router: ReturnType<typeof useRouter>;
}) {
  const [stage, setStage] = useState<"saving" | "planning" | "done">("saving");
  const level = thetaToLevel(state.quiz.theta);
  const correctCount = state.quiz.responses.filter((r) => r.correct).length;

  useEffect(() => {
    let cancel = false;
    (async () => {
      const profile = {
        goals: state.goals,
        categoryIds: state.categoryIds,
        level,
        theta: state.quiz.theta,
        topicSignals: state.quiz.responses.map((r) => ({
          topico: r.question.topico,
          correct: r.correct,
          difficulty: r.question.dificuldade,
        })),
        styleWeights: scoreVark(Object.values(state.vark)),
        scheduleStats: null,
      };
      try {
        await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        });
        if (cancel) return;
        setStage("planning");
        // Pre-generate the plan now so /plan loads instantly from the DB later.
        await fetch("/api/plan/generate", { method: "POST" });
      } catch {
        // ignore — plan can still be generated on first /plan visit
      } finally {
        if (!cancel) setStage("done");
      }
    })();
    return () => {
      cancel = true;
    };
  }, []); // eslint-disable-line

  const title =
    stage === "saving"
      ? "Salvando seu perfil..."
      : stage === "planning"
        ? "Montando sua trilha..."
        : "Tudo pronto!";
  const subtitle =
    stage === "saving"
      ? "Guardando suas respostas no nosso banco."
      : stage === "planning"
        ? "A IA está organizando seus tópicos e revisões."
        : `Identificamos seu nível como ${level} (${correctCount}/${state.quiz.responses.length} acertos).`;

  return (
    <Shell
      step={5}
      total={TOTAL_STEPS}
      title={title}
      subtitle={subtitle}
      footer={
        stage === "done" ? (
          <PrimaryButton onClick={() => router.push("/plan")}>
            Ver meu plano de estudos
          </PrimaryButton>
        ) : undefined
      }
    >
      <div className="flex justify-center py-8">
        {stage !== "done" ? (
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        ) : (
          <div className="text-6xl">🎉</div>
        )}
      </div>
    </Shell>
  );
}
