export type FormatKind = "video" | "text" | "quiz";

export type FormatOption = {
  kind: FormatKind;
  label: string;
  estimatedMinutes: number;
  /** vídeo: curso CEFIS */
  courseId?: number;
  courseBanner?: string;
  courseTitle?: string;
  crcActive?: boolean;
  crcCreditHours?: number | null;
  /** quiz */
  quizScope?: "review" | "topic";
  /** texto/podcast: hint pro gerador lazy */
  prompt?: string;
};

export type StopKind = "topic" | "review";

export type Stop = {
  id: string;
  kind: StopKind;
  topic: string;
  summary: string;
  reviewsStopIds?: string[];
  formats: FormatOption[];
};

export type Plan = {
  generatedAt: string;
  level: string;
  stops: Stop[];
  styleWeights: {
    visual: number;
    aural: number;
    reading: number;
    kinesthetic: number;
  };
};

export const VARK_TO_KIND: Record<
  "visual" | "aural" | "reading" | "kinesthetic",
  FormatKind
> = {
  visual: "video",
  aural: "video",
  reading: "text",
  kinesthetic: "quiz",
};
