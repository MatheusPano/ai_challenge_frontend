"use client";

import { useEffect, useReducer, useState } from "react";
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
  const q = VARK_QUESTIONS[idx];
  const selected = state.vark[q.id];
  const isLast = idx === VARK_QUESTIONS.length - 1;

  function choose(key: VarkKey) {
    dispatch({ type: "answer_vark", questionId: q.id, key });
    if (!isLast) {
      setTimeout(() => setIdx((i) => i + 1), 180);
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

  // Auto-advance when quiz is done
  useEffect(() => {
    if (isFinished(responses)) {
      dispatch({ type: "next" });
    }
  }, [responses, dispatch]);

  // Fetch next question
  useEffect(() => {
    if (current) return;
    if (isFinished(responses)) return;
    let cancel = false;
    setLoading(true);
    setPicked(null);
    fetch("/api/quiz/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goals: state.goals,
        categoryIds: state.categoryIds,
        difficulty: nextDifficulty(theta),
        askedTopics: responses.map((r) => r.question.topico),
      }),
    })
      .then((r) => r.json())
      .then((q: Question) => {
        if (cancel) return;
        dispatch({ type: "set_current_question", q });
        setStartedAt(Date.now());
      })
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [current, responses, theta, state.goals, state.categoryIds, dispatch]);

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
      {loading || !current ? (
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
  const [stage, setStage] = useState<"loading" | "done">("loading");
  const level = thetaToLevel(state.quiz.theta);
  const correctCount = state.quiz.responses.filter((r) => r.correct).length;

  useEffect(() => {
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
    fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    })
      .then(() => setStage("done"))
      .catch(() => setStage("done"));
  }, []); // eslint-disable-line

  return (
    <Shell
      step={5}
      total={TOTAL_STEPS}
      title={stage === "loading" ? "Montando seu plano..." : "Tudo pronto!"}
      subtitle={
        stage === "loading"
          ? "Analisando suas respostas e gerando recomendações."
          : `Identificamos seu nível como ${level} (${correctCount}/${state.quiz.responses.length} acertos).`
      }
      footer={
        stage === "done" ? (
          <PrimaryButton onClick={() => router.push("/plan")}>
            Ver meu plano de estudos
          </PrimaryButton>
        ) : undefined
      }
    >
      <div className="flex justify-center py-8">
        {stage === "loading" ? (
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        ) : (
          <div className="text-6xl">🎉</div>
        )}
      </div>
    </Shell>
  );
}
