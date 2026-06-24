import { loginAction } from "@/app/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;

  return (
    <main className="dot-grid flex min-h-screen items-center justify-center bg-grey-light px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-red text-xl font-black text-white shadow-panel-lg">
            KB
          </div>
          <div>
            <div className="text-lg font-black tracking-tight text-brand-black">KB ELEMENTS</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-grey-mid">
              ERP System
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-grey-border bg-white p-8 shadow-panel-lg">
          <h1 className="mb-1 text-xl font-black text-brand-black">Willkommen</h1>
          <p className="mb-7 text-sm text-grey-mid">Melde dich mit deinen Zugangsdaten an.</p>

          {error && (
            <div className="mb-5 rounded-lg border border-brand-red/20 bg-brand-red/5 px-4 py-3 font-mono text-xs text-brand-red">
              E-Mail oder Passwort falsch.
            </div>
          )}

          <form action={loginAction} className="grid gap-5">
            <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />

            <label className="grid gap-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                E-Mail
              </span>
              <input
                name="email"
                type="email"
                required
                placeholder="name@firma.de"
                className="h-11 rounded-lg border border-grey-border bg-grey-light px-3 text-sm text-grey-dark placeholder:text-grey-mid/60 transition-colors focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                Passwort
              </span>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="h-11 rounded-lg border border-grey-border bg-grey-light px-3 text-sm text-grey-dark placeholder:text-grey-mid/60 transition-colors focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
              />
            </label>

            <button
              type="submit"
              className="mt-1 h-11 rounded-lg bg-brand-red text-sm font-bold text-white transition-colors hover:bg-brand-red-dark"
            >
              Einloggen
            </button>
          </form>
        </div>

        <p className="mt-5 text-center font-mono text-[10px] text-grey-mid">
          KB ELEMENTS · Lagerverwaltung
        </p>
      </div>
    </main>
  );
}
