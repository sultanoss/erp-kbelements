"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  defaults: {
    q: string;
    status: string;
    resolution: string;
    from: string;
    to: string;
    outlet: string;
  };
}

export default function ReturnsFilterBar({ defaults }: Props) {
  const [q, setQ] = useState(defaults.q);
  const [status, setStatus] = useState(defaults.status);
  const [resolution, setResolution] = useState(defaults.resolution);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [outlet, setOutlet] = useState(defaults.outlet === "1");
  const router = useRouter();

  useEffect(() => {
    const noParams = !defaults.q && !defaults.status && !defaults.resolution && !defaults.from && !defaults.to && !defaults.outlet;
    if (noParams) {
      const saved = sessionStorage.getItem("returns_filter");
      if (saved) router.replace(`/returns?${saved}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasActiveFilter = !!(defaults.q || defaults.status || defaults.resolution || defaults.from || defaults.to || defaults.outlet);
  const hasFormValues = !!(q || status || resolution || from || to || outlet);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (resolution) p.set("resolution", resolution);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (outlet) p.set("outlet", "1");
    sessionStorage.setItem("returns_filter", p.toString());
    router.push(`/returns${p.toString() ? `?${p.toString()}` : ""}`);
  }

  function handleReset() {
    sessionStorage.removeItem("returns_filter");
    setQ(""); setStatus(""); setResolution(""); setFrom(""); setTo(""); setOutlet(false);
    router.push("/returns");
  }

  return (
    <div className="card p-4 mb-5">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Suche (Name, Auftrag, Text)</label>
          <input
            className="input"
            placeholder="Suchen..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Alle</option>
            <option value="eingegangen">Eingegangen</option>
            <option value="in_bearbeitung">In Bearbeitung</option>
            <option value="nicht_zustellbar">Nicht zustellbar</option>
            <option value="klaeren_mit_kunde">Klären mit Kunde</option>
            <option value="wieder_an_kunde">Wieder an Kunde</option>
            <option value="garantie">Garantie</option>
            <option value="austausch">Austausch</option>
            <option value="erledigt">Erledigt</option>
          </select>
        </div>
        <div>
          <label className="label">Abschluss</label>
          <select className="input" value={resolution} onChange={(e) => setResolution(e.target.value)}>
            <option value="">Alle</option>
            <option value="neu">Neu</option>
            <option value="ns">NS</option>
            <option value="garantie">Garantie</option>
            <option value="bware">B-Ware</option>
          </select>
        </div>
        <div>
          <label className="label">Von</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Bis</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={outlet}
              onChange={(e) => setOutlet(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm font-medium text-amber-700">Nur Outlet</span>
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!hasFormValues}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Filtern
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasActiveFilter}
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Zurücksetzen
          </button>
        </div>
      </form>
    </div>
  );
}
