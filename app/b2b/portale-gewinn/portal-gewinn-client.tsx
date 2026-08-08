"use client";

import { useState, useTransition } from "react";
import { saveExtraCosts } from "./actions";

type Item = { sku: string; purchasePrice: number | null };

export function PortalGewinnClient({
  items,
  extraCosts: initialCosts,
}: {
  items: Item[];
  extraCosts: Record<string, number>;
}) {
  const [costs, setCosts] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const it of items) {
      m[it.sku] = initialCosts[it.sku] != null ? String(initialCosts[it.sku]) : "";
    }
    return m;
  });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleChange(sku: string, val: string) {
    setCosts((prev) => ({ ...prev, [sku]: val }));
    setSaved(false);
  }

  function handleSave() {
    const parsed: Record<string, number | null> = {};
    for (const [sku, val] of Object.entries(costs)) {
      const n = parseFloat(val.replace(",", "."));
      parsed[sku] = isNaN(n) ? null : n;
    }
    startTransition(async () => {
      await saveExtraCosts(parsed);
      setSaved(true);
    });
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-xs text-grey-mid">{items.length} Artikel</p>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-brand-red px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-brand-red-dark transition-colors disabled:opacity-50"
        >
          {isPending ? "Speichern…" : saved ? "✓ Gespeichert" : "Speichern"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-grey-border bg-white">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-grey-border bg-grey-light">
              <th className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">SKU</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Ø-EK</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Zusatzkosten</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-border">
            {items.map((it) => (
              <tr key={it.sku} className="hover:bg-grey-light/40">
                <td className="px-4 py-2.5 font-mono text-xs font-semibold text-brand-red">{it.sku}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-grey-dark">
                  {it.purchasePrice != null ? `${it.purchasePrice.toFixed(2)} €` : "—"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={costs[it.sku] ?? ""}
                      onChange={(e) => handleChange(it.sku, e.target.value)}
                      placeholder="0.00"
                      className="w-24 rounded border border-grey-border bg-white px-2 py-1 text-right font-mono text-xs text-grey-dark focus:border-brand-red focus:outline-none"
                    />
                    <span className="font-mono text-xs text-grey-mid">€</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
