"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      router.push("/onboarding");
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-emerald-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white text-3xl font-black shadow-lg shadow-indigo-200 mb-4">
            C
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Seu tutor de aprendizado
          </h1>
          <p className="text-slate-500 mt-2">
            Entre com sua conta CEFIS para começar.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 space-y-5 border border-slate-100"
        >
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              E-mail ou CPF
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="voce@email.com"
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Senha
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none transition"
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
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-300 text-white font-bold py-3.5 text-base shadow-lg shadow-indigo-200 transition"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="text-center text-xs text-slate-400">
            Não tem conta?{" "}
            <a
              href="https://cefis.com.br"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-indigo-600 hover:underline"
            >
              Cadastre-se gratuitamente
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
