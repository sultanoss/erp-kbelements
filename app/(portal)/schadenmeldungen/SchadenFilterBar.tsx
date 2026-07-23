"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  defaults: { q: string; status: string; unterlagen: string; von: string; bis: string };
}

export default function SchadenFilterBar({ defaults }: Props) {
  const [q, setQ] = useState(defaults.q);
  const [status, setStatus] = useState(defaults.status);
  const [unterlagen, setUnterlagen] = useState(defaults.unterlagen);
  const [von, setVon] = useState(defaults.von);
  const [bis, setBis] = useState(defaults.bis);
  const router = useRouter();

  const hasActiveFilter = !!(defaults.q || defaults.status || defaults.unterlagen || defaults.von || defaults.bis);
  const hasFormValues = !!(q || status || unterlagen || von || bis);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (unterlagen) p.set("unterlagen", unterlagen);
    if (von) p.set("von", von);
    if (bis) p.set("bis", bis);
    router.push(`/schadenmeldungen${p.toString() ? `?${p.toString()}` : ""}`);
  }

  function handleReset() {
    setQ(""); setStatus(""); setUnterlagen(""); setVon(""); setBis("");
    router.push("/schadenmeldungen");
  }

  return (
    <div className="card p-4 mb-5">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="label">Suche</label>
          <input className="input" placeholder="GEL-Nr, Auftragsnummer, Rechnungsnummer…"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Alle</option>
            <option value="offen">Offen</option>
            <option value="reguliert">Reguliert</option>
            <option value="bezahlt">Bezahlt</option>
          </select>
        </div>
        <div>
          <label className="label">Unterlagen an GEL</label>
          <select className="input" value={unterlagen} onChange={(e) => setUnterlagen(e.target.value)}>
            <option value="">Alle</option>
            <option value="1">Gesendet</option>
            <option value="0">Nicht gesendet</option>
          </select>
        </div>
        <div>
          <label className="label">Datum von</label>
          <input type="date" className="input" value={von} onChange={(e) => setVon(e.target.value)} />
        </div>
        <div>
          <label className="label">Datum bis</label>
          <input type="date" className="input" value={bis} onChange={(e) => setBis(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={!hasFormValues}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">Filtern</button>
          <button type="button" onClick={handleReset} disabled={!hasActiveFilter}
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed">Zurücksetzen</button>
        </div>
      </form>
    </div>
  );
}
