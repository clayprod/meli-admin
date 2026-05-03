"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Credenciais invalidas.");
      }
    } catch {
      setError("Erro ao tentar fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.94),_rgba(248,250,252,0.98))]" />
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-[32px] border border-white/70 bg-white/80 px-8 py-10 shadow-[0_28px_80px_-35px_rgba(2,6,23,0.25)] backdrop-blur">
            <div className="mb-8 text-center">
              <div className="mb-4 flex items-center justify-center gap-3">
                <Image
                  src="/tenryu_horizontal.png"
                  alt="Tenryu"
                  width={1413}
                  height={423}
                  priority
                  unoptimized
                  className="h-9 w-auto"
                />
                <span className="text-2xl font-light text-slate-300" aria-hidden="true">
                  |
                </span>
                <Image
                  src="/Logotipo_MercadoLivre.png"
                  alt="Mercado Livre"
                  width={500}
                  height={126}
                  priority
                  unoptimized
                  className="h-7 w-auto"
                />
              </div>
              <p className="mt-1 text-sm text-slate-500">Entre com suas credenciais para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-md transition hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
