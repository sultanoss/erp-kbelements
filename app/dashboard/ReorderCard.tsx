"use client";

import { useState } from "react";
import { Panel } from "@/components/ui";

type ReorderRow = { sku: string; totalStock: number; weeklyAvg: number; daysLeft: number | null };

export function ReorderCard({ rows }: { rows: ReorderRow[] }) {
  const [query, setQuery] = useState("");
  const urgentCount = rows.filter((r) => r.daysLeft !== null && r.daysLeft < 60).length;
  const filtered = query.trim()
    ? rows.filter((r) => r.sku.toLowerCase().includes(query.trim().toLowerCase()))
    : rows;

  return (
    <Panel className="overflow-hidden">
      <details open>
        <summary className="flex cursor-pointer list-none items-center justify-between border-b border-grey-border px-5 py-3 [&::-webkit-details-marker]:hidden">
          <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Warenladung China — Reichweite (60 Tage Ziel)</div>
          <div className="flex items-center gap-2">
            {urgentCount > 0 && <span className="font-mono text-xs font-bold text-brand-red">{urgentCount} unter 60 Tage</span>}
            <span className="font-mono text-[10px] text-grey-mid select-none">▾</span>
          </div>
        </summary>
        <div className="border-b border-grey-border px-5 py-2">
          <input
            type="search"
            placeholder="SKU suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded border border-grey-border bg-transparent px-3 py-1.5 font-mono text-sm text-grey-dark placeholder:text-grey-mid focus:outline-none focus:ring-1 focus:ring-brand-red"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-grey-border bg-grey-light/30">
                <th className="px-5 py-2 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-grey-mid">SKU</th>
                <th className="px-5 py-2 text-right font-mono text-[10px] font-semibold uppercase tracking-wider text-grey-mid">Bestand</th>
                <th className="px-5 py-2 text-right font-mono text-[10px] font-semibold uppercase tracking-wider text-grey-mid">Ø/Woche</th>
                <th className="px-5 py-2 text-right font-mono text-[10px] font-semibold uppercase tracking-wider text-grey-mid">Reichweite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-4 text-center font-mono text-xs text-grey-mid">Keine SKU gefunden.</td></tr>
              ) : filtered.map((r) => {
                const urgent = r.daysLeft !== null && r.daysLeft < 60;
                const ok = r.daysLeft !== null && r.daysLeft >= 60;
                return (
                  <tr key={r.sku}>
                    <td className={`px-5 py-2 font-mono text-sm font-semibold ${urgent ? "text-brand-red" : "text-grey-dark"}`}>{r.sku}</td>
                    <td className="px-5 py-2 text-right font-mono tabular-nums text-sm text-grey-dark">{r.totalStock} Stk.</td>
                    <td className="px-5 py-2 text-right font-mono tabular-nums text-sm text-grey-dark">{r.weeklyAvg} Stk.</td>
                    <td className={`px-5 py-2 text-right font-mono tabular-nums text-sm font-bold ${urgent ? "text-brand-red" : ok ? "text-green-600" : "text-grey-mid"}`}>
                      {r.daysLeft !== null ? `${r.daysLeft} Tage` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </Panel>
  );
}
