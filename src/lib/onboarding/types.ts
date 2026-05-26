export type Goal = "carreira" | "crc" | "concurso" | "conhecimento";

export type Difficulty = "easy" | "medium" | "hard";

export type Question = {
  id: string;
  enunciado: string;
  alternativas: string[];
  correta: number;
  dificuldade: Difficulty;
  topico: string;
  explicacao?: string;
};

export type QuizResponse = {
  question: Question;
  picked: number;
  correct: boolean;
  latencyMs: number;
};

export type OnboardingState = {
  step: number;
  goals: Goal[];
  categoryIds: number[];
  vark: { [questionId: string]: import("./vark").VarkKey };
  quiz: {
    theta: number;
    responses: QuizResponse[];
    current?: Question;
  };
};

export const CATEGORIES: { id: number; name: string; emoji: string }[] = [
  { id: 1, name: "Fiscal", emoji: "🧾" },
  { id: 2, name: "Contábil", emoji: "📊" },
  { id: 3, name: "Trabalhista", emoji: "⚖️" },
  { id: 5, name: "Gestão", emoji: "📈" },
  { id: 7, name: "Tecnologia", emoji: "💻" },
  { id: 6, name: "Desenvolvimento Pessoal", emoji: "🌱" },
  { id: 4, name: "Outro", emoji: "💭" },
];

export const GOALS: {
  id: Goal;
  title: string;
  description: string;
  icon: "cap" | "briefcase" | "brain" | "globe" | "target";
}[] = [
  {
    id: "carreira",
    title: "Evoluir na carreira",
    description: "Desenvolver habilidades profissionais",
    icon: "briefcase",
  },
  {
    id: "crc",
    title: "Pontos CRC",
    description: "Acumular créditos para o conselho",
    icon: "cap",
  },
  {
    id: "concurso",
    title: "Passar em concurso",
    description: "Concursos públicos e certificações",
    icon: "target",
  },
  {
    id: "conhecimento",
    title: "Conhecimento sempre é bom",
    description: "Aprender por prazer e curiosidade",
    icon: "brain",
  },
];
