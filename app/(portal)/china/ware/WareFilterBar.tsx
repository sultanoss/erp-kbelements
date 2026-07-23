"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  defaults: { q: string };
}

export default function WareFilterBar({ defaults }: Props) {
  const [q, setQ] = useState(defaults.q);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    router.push(`/china/ware${p.toString() ? `?${p}` : ""}`);
  }

  function handleReset() {
    setQ("");
    router.push("/china/ware");
  }

  return (
    <div className="card p-4 mb-5">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Suche (Fabrik, Order/PI, Artikel)</label>
          <input className="input" placeholder="Suchen..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={!q} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">Filtern</button>
          <button type="button" onClick={handleReset} disabled={!defaults.q} className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed">Zurücksetzen</button>
        </div>
      </form>
    </div>
  );
}
