export type VarkKey = "visual" | "aural" | "reading" | "kinesthetic";

export type VarkOption = { label: string; key: VarkKey };
export type VarkQuestion = { id: string; prompt: string; options: VarkOption[] };

export const VARK_QUESTIONS: VarkQuestion[] = [
  {
    id: "v1",
    prompt: "Quando você precisa aprender algo novo do zero, o que prefere?",
    options: [
      { label: "Ver um diagrama, gráfico ou infográfico", key: "visual" },
      { label: "Ouvir alguém explicar (aula, podcast)", key: "aural" },
      { label: "Ler um texto bem estruturado", key: "reading" },
      { label: "Pôr a mão na massa logo de cara", key: "kinesthetic" },
    ],
  },
  {
    id: "v2",
    prompt: "Acabou uma aula. Para fixar o conteúdo, você costuma...",
    options: [
      { label: "Fazer um mapa mental ou esquema visual", key: "visual" },
      { label: "Repetir e discutir em voz alta", key: "aural" },
      { label: "Escrever um resumo com suas palavras", key: "reading" },
      { label: "Resolver exercícios ou aplicar na prática", key: "kinesthetic" },
    ],
  },
  {
    id: "v3",
    prompt: "Numa reunião técnica, você fica mais atento quando...",
    options: [
      { label: "Há slides com gráficos e imagens", key: "visual" },
      { label: "Quem fala é claro e didático", key: "aural" },
      { label: "Existe um documento detalhado de apoio", key: "reading" },
      { label: "Tem uma demonstração ao vivo", key: "kinesthetic" },
    ],
  },
  {
    id: "v4",
    prompt: "Para lembrar de uma data ou número importante, você...",
    options: [
      { label: "Visualiza onde estava anotado", key: "visual" },
      { label: "Repete em voz alta várias vezes", key: "aural" },
      { label: "Escreve na agenda ou caderno", key: "reading" },
      { label: "Associa a uma ação ou rotina", key: "kinesthetic" },
    ],
  },
  {
    id: "v5",
    prompt: "Aprendendo uma ferramenta nova de trabalho, você prefere...",
    options: [
      { label: "Assistir um vídeo tour", key: "visual" },
      { label: "Ouvir um colega explicar", key: "aural" },
      { label: "Ler a documentação", key: "reading" },
      { label: "Testar e errar até pegar o jeito", key: "kinesthetic" },
    ],
  },
];

export type StyleWeights = Record<VarkKey, number>;

export const NEUTRAL_WEIGHTS: StyleWeights = {
  visual: 0.25,
  aural: 0.25,
  reading: 0.25,
  kinesthetic: 0.25,
};

export function scoreVark(answers: VarkKey[]): StyleWeights {
  const counts: StyleWeights = {
    visual: 0,
    aural: 0,
    reading: 0,
    kinesthetic: 0,
  };
  answers.forEach((k) => (counts[k] += 1));
  const total = answers.length || 1;
  return {
    visual: counts.visual / total,
    aural: counts.aural / total,
    reading: counts.reading / total,
    kinesthetic: counts.kinesthetic / total,
  };
}

export function dominantStyle(w: StyleWeights): VarkKey {
  return (Object.entries(w) as [VarkKey, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0][0];
}
