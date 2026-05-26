"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ParticleField } from "@/components/ParticleField";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Não foi possível entrar.");
        return;
      }
      // If the user already has a plan, jump straight to it; otherwise onboarding.
      const planRes = await fetch("/api/plan/current");
      router.push(planRes.ok ? "/plan" : "/onboarding");
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex-1 flex items-center justify-center px-4 bg-white">
      <ParticleField />
      <div className="relative z-10 w-full max-w-xl">
        <div className="text-center mb-10">
          <Logo className="h-14 w-auto mx-auto text-slate-900 mb-8" />
          <h1 className="text-4xl font-semibold text-slate-900 tracking-tight">
            A IA te guiando para o conhecimento
          </h1>
          <p className="text-slate-500 mt-3 text-base">
            Entre com sua conta CEFIS para começar.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white/85 backdrop-blur-xl rounded-3xl p-10 sm:p-12 space-y-6 border border-slate-200/70 shadow-[0_8px_60px_-15px_rgba(15,23,42,0.15)]"
        >
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              E-mail ou CPF
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="voce@email.com"
              className="w-full rounded-xl border border-slate-200 bg-white/60 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Senha
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-white/60 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:bg-slate-400 text-white font-medium py-4 text-base tracking-tight transition"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="text-center text-xs text-slate-400 pt-2">
            Não tem conta?{" "}
            <a
              href="https://cefis.com.br"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-slate-700 hover:text-slate-900 underline underline-offset-2 decoration-slate-300 hover:decoration-slate-700"
            >
              Cadastre-se gratuitamente
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
