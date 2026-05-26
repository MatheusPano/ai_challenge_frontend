import type { Difficulty, QuizResponse } from "./types";

const W: Record<Difficulty, number> = { easy: 0.05, medium: 0.1, hard: 0.15 };

export const MAX_QUESTIONS = 6;

export function updateTheta(theta: number, r: QuizResponse): number {
  const delta = W[r.question.dificuldade];
  const next = r.correct ? theta + delta : theta - delta;
  return Math.max(0, Math.min(1, next));
}

export function nextDifficulty(theta: number): Difficulty {
  if (theta > 0.65) return "hard";
  if (theta < 0.35) return "easy";
  return "medium";
}

export function thetaToLevel(
  theta: number,
): "iniciante" | "intermediário" | "avançado" {
  if (theta < 0.4) return "iniciante";
  if (theta < 0.7) return "intermediário";
  return "avançado";
}

export function isFinished(responses: QuizResponse[]): boolean {
  if (responses.length >= MAX_QUESTIONS) return true;
  if (responses.length >= 5) {
    const last5 = responses.slice(-5);
    if (last5.every((r) => r.correct)) return true;
    if (last5.every((r) => !r.correct)) return true;
  }
  return false;
}
