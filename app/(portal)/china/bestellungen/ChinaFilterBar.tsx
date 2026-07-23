"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  defaults: {
    q: string;
    von: string;
    bis: string;
    angezahlt: string;
    bezahlt: string;
    verschifft: string;
  };
}

export default function ChinaFilterBar({ defaults }: Props) {
  const [q, setQ] = useState(defaults.q);
  const [von, setVon] = useState(defaults.von);
  const [bis, setBis] = useState(defaults.bis);
  const [angezahlt, setAngezahlt] = useState(defaults.angezahlt);
  const [bezahlt, setBezahlt] = useState(defaults.bezahlt);
  const [verschifft, setVerschifft] = useState(defaults.verschifft);
  const router = useRouter();

  const hasActive = !!(defaults.q || defaults.von || defaults.bis || defaults.angezahlt || defaults.bezahlt || defaults.verschifft);
  const hasValues = !!(q || von || bis || angezahlt || bezahlt || verschifft);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (von) p.set("von", von);
    if (bis) p.set("bis", bis);
    if (angezahlt) p.set("angezahlt", angezahlt);
    if (bezahlt) p.set("bezahlt", bezahlt);
    if (verschifft) p.set("verschifft", verschifft);
    router.push(`/china/bestellungen${p.toString() ? `?${p}` : ""}`);
  }

  function handleReset() {
    setQ(""); setVon(""); setBis(""); setAngezahlt(""); setBezahlt(""); setVerschifft("");
    router.push("/china/bestellungen");
  }

  return (
    <div className="card p-4 mb-5">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="label">Suche (Fabrik, Order/PI)</label>
          <input className="input" placeholder="Suchen..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label className="label">Von</label>
          <input type="date" className="input" value={von} onChange={(e) => setVon(e.target.value)} />
        </div>
        <div>
          <label className="label">Bis</label>
          <input type="date" className="input" value={bis} onChange={(e) => setBis(e.target.value)} />
        </div>
        <div>
          <label className="label">Angezahlt</label>
          <select className="input" value={angezahlt} onChange={(e) => setAngezahlt(e.target.value)}>
            <option value="">Alle</option>
            <option value="ja">Ja</option>
            <option value="nein">Nein</option>
          </select>
        </div>
        <div>
          <label className="label">Bezahlt</label>
          <select className="input" value={bezahlt} onChange={(e) => setBezahlt(e.target.value)}>
            <option value="">Alle</option>
            <option value="ja">Ja</option>
            <option value="nein">Nein</option>
          </select>
        </div>
        <div>
          <label className="label">Verschifft</label>
          <select className="input" value={verschifft} onChange={(e) => setVerschifft(e.target.value)}>
            <option value="">Alle</option>
            <option value="ja">Ja</option>
            <option value="nein">Nein</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={!hasValues} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
            Filtern
          </button>
          <button type="button" onClick={handleReset} disabled={!hasActive} className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed">
            Zurücksetzen
          </button>
        </div>
      </form>
    </div>
  );
}
