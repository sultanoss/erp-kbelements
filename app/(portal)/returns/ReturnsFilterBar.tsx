"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  defaults: {
    q: string;
    status: string;
    resolution: string;
    from: string;
    to: string;
  };
}

export default function ReturnsFilterBar({ defaults }: Props) {
  const [q, setQ] = useState(defaults.q);
  const [status, setStatus] = useState(defaults.status);
  const [resolution, setResolution] = useState(defaults.resolution);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const router = useRouter();

  const hasActiveFilter = !!(defaults.q || defaults.status || defaults.resolution || defaults.from || defaults.to);
  const hasFormValues = !!(q || status || resolution || from || to);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (resolution) p.set("resolution", resolution);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    router.push(`/returns${p.toString() ? `?${p.toString()}` : ""}`);
  }

  function handleReset() {
    setQ(""); setStatus(""); setResolution(""); setFrom(""); setTo("");
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
