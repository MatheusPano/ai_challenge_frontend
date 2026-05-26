"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  name: string;
  firstName: string;
  email: string;
  avatar?: string | null;
};

function readUserCookie(): User | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith("cefis_user="));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.split("=")[1])) as User;
  } catch {
    return null;
  }
}

export function UserMenu({ variant = "light" }: { variant?: "light" | "dark" }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"reset" | "logout" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(readUserCookie());
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleReset() {
    if (!confirm("Apagar sua trilha atual e refazer o quiz?")) return;
    setBusy("reset");
    try {
      await fetch("/api/plan/reset", { method: "POST" });
      router.push("/onboarding");
    } finally {
      setBusy(null);
      setOpen(false);
    }
  }

  async function handleLogout() {
    setBusy("logout");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } finally {
      setBusy(null);
    }
  }

  if (!user) return null;

  const initial = user.firstName?.[0]?.toUpperCase() ?? "?";
  const triggerLight =
    "bg-white text-slate-900 border-slate-200 hover:border-slate-300";
  const triggerDark = "bg-white/10 text-white border-white/20 hover:bg-white/20";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full border px-2 py-1.5 transition ${variant === "dark" ? triggerDark : triggerLight}`}
      >
        <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black overflow-hidden">
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </span>
        <span className="text-sm font-semibold pr-1 max-w-[140px] truncate">
          {user.firstName}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden z-20 text-slate-900">
          <div className="p-4 border-b border-slate-100">
            <p className="font-bold text-sm truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <button
              onClick={handleReset}
              disabled={busy !== null}
              className="w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-blue-50 disabled:opacity-50 transition flex items-center gap-2"
            >
              <span className="text-base">⟲</span>
              <span>
                {busy === "reset" ? "Apagando..." : "Gerar nova trilha de conhecimento"}
              </span>
            </button>
            <button
              onClick={handleLogout}
              disabled={busy !== null}
              className="w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-rose-50 text-rose-600 disabled:opacity-50 transition flex items-center gap-2"
            >
              <span className="text-base">↩</span>
              <span>{busy === "logout" ? "Saindo..." : "Sair"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
