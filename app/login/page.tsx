"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const csrfRes = await fetch("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();

    const body = new URLSearchParams({
      email: email.toLowerCase(),
      password,
      csrfToken,
      callbackUrl: "/",
      json: "true",
    });

    const res = await fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      redirect: "manual",
    });

    if (res.status === 302 || res.status === 200) {
      const location = res.headers.get("location") ?? "/";
      if (location.includes("error")) {
        setError(true);
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <main className="dot-grid flex min-h-screen items-center justify-center bg-grey-light px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <img src="/logo.jpg" alt="KB ELEMENTS" className="h-10 w-auto" />
        </div>

        <div className="rounded-2xl border border-grey-border bg-white p-8 shadow-panel-lg">
          <h1 className="mb-1 text-xl font-black text-brand-black">Willkommen</h1>
          <p className="mb-7 text-sm text-grey-mid">Melde dich mit deinen Zugangsdaten an.</p>

          {error && (
            <div className="mb-5 rounded-lg border border-brand-red/20 bg-brand-red/5 px-4 py-3 font-mono text-xs text-brand-red">
              E-Mail oder Passwort falsch.
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-5">
            <label className="grid gap-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                E-Mail
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@firma.de"
                className="h-11 rounded-lg border border-grey-border bg-grey-light px-3 text-sm text-grey-dark placeholder:text-grey-mid/60 transition-colors focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                Passwort
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-lg border border-grey-border bg-grey-light px-3 text-sm text-grey-dark placeholder:text-grey-mid/60 transition-colors focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-11 rounded-lg bg-brand-red text-sm font-bold text-white transition-colors hover:bg-brand-red-dark disabled:opacity-60"
            >
              {loading ? "Wird angemeldet…" : "Einloggen"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center font-mono text-[10px] text-grey-mid">
          Lagerverwaltung
        </p>
      </div>
    </main>
  );
}
