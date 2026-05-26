"use client";

import type { FormatKind, FormatOption } from "@/lib/plan/types";

const META: Record<
  FormatKind,
  { color: string; icon: React.ReactNode; name: string }
> = {
  video: {
    color: "bg-indigo-500/90 hover:bg-indigo-400 text-white border-indigo-400",
    name: "Vídeo",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M8 5v14l11-7z" />
      </svg>
    ),
  },
  text: {
    color: "bg-emerald-500/90 hover:bg-emerald-400 text-white border-emerald-400",
    name: "Texto",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
        <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
      </svg>
    ),
  },
  podcast: {
    color: "bg-rose-500/90 hover:bg-rose-400 text-white border-rose-400",
    name: "Podcast",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  quiz: {
    color: "bg-amber-500/90 hover:bg-amber-400 text-white border-amber-400",
    name: "Quiz",
    icon: <span className="font-black text-sm leading-none">?</span>,
  },
};

export function FormatChip({
  format,
  onClick,
  done,
}: {
  format: FormatOption;
  onClick: () => void;
  done?: boolean;
}) {
  const m = META[format.kind];
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

export { META as FORMAT_META };
