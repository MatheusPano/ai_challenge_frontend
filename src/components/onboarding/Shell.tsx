"use client";

import { ReactNode } from "react";

type Props = {
  step: number;
  total: number;
  onBack?: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Shell({
  step,
  total,
  onBack,
  title,
  subtitle,
  children,
  footer,
}: Props) {
  const pct = Math.round((step / total) * 100);
  return (
    <main className="flex-1 flex flex-col bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
      <header className="px-4 sm:px-8 py-4 flex items-center gap-4 max-w-3xl w-full mx-auto">
        <button
          onClick={onBack}
          disabled={!onBack}
          className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-2xl leading-none"
          aria-label="Voltar"
        >
          ←
        </button>
        <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-500 tabular-nums">
          {step}/{total}
        </span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6">
        <div className="w-full max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight text-center">
            {title}
          </h1>
          {subtitle && (
            <p className="text-slate-500 text-center mt-2 mb-8">{subtitle}</p>
          )}
          {!subtitle && <div className="mb-8" />}
          {children}
        </div>
      </div>

      {footer && (
        <footer className="px-4 sm:px-8 py-6 max-w-2xl w-full mx-auto">
          {footer}
        </footer>
      )}
    </main>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-300 text-white font-bold py-3.5 text-base shadow-lg shadow-indigo-200 disabled:shadow-none transition"
    >
      {children}
    </button>
  );
}

export function OptionCard({
  selected,
  onClick,
  children,
  className = "",
}: {
  selected?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left w-full rounded-2xl border-2 px-5 py-4 transition font-semibold ${
        selected
          ? "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md shadow-indigo-100"
          : "border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/30"
      } ${className}`}
    >
      {children}
    </button>
  );
}
