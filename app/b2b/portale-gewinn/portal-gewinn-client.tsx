"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveExtraCosts } from "./actions";

type Item = { sku: string; purchasePrice: number | null };

export function PortalGewinnClient({
  items,
  extraCosts: initialCosts,
  avgSellPrice,
  soldQty,
  von: initialVon,
  bis: initialBis,
}: {
  items: Item[];
  extraCosts: Record<string, number>;
  avgSellPrice: Record<string, number>;
  soldQty: Record<string, number>;
  von: string;
  bis: string;
}) {
  const router = useRouter();
  const [von, setVon] = useState(initialVon);
  const [bis, setBis] = useState(initialBis);

  const [costs, setCosts] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const it of items) {
      m[it.sku] = initialCosts[it.sku] != null ? String(initialCosts[it.sku]) : "";
    }
    return m;
  });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleFilter() {
    router.push(`/b2b/portale-gewinn?von=${von}&bis=${bis}`);
  }

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
    <div className="max-w-5xl">
      {/* Datumsfilter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="font-mono text-xs text-grey-mid">Von</label>
          <input
            type="date"
            value={von}
            onChange={(e) => setVon(e.target.value)}
            className="rounded border border-grey-border px-2 py-1 font-mono text-xs text-grey-dark focus:border-brand-red focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="font-mono text-xs text-grey-mid">Bis</label>
          <input
            type="date"
            value={bis}
            onChange={(e) => setBis(e.target.value)}
            className="rounded border border-grey-border px-2 py-1 font-mono text-xs text-grey-dark focus:border-brand-red focus:outline-none"
          />
        </div>
        <button
          onClick={handleFilter}
          className="rounded-lg border border-brand-red px-3 py-1.5 font-mono text-xs font-semibold text-brand-red hover:bg-brand-red hover:text-white transition-colors"
        >
          Anwenden
        </button>
        <span className="ml-auto font-mono text-xs text-grey-mid">{items.length} Artikel · MediaMarkt</span>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-brand-red px-4 py-1.5 font-mono text-xs font-semibold text-white hover:bg-brand-red-dark transition-colors disabled:opacity-50"
        >
          {isPending ? "Speichern…" : saved ? "✓ Gespeichert" : "Speichern"}
        </button>
      </div>

      {/* Tabelle */}
      <div className="overflow-x-auto rounded-xl border border-grey-border bg-white">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-grey-border bg-grey-light">
              <th className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">SKU</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Ø-EK</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Ø-VP MediaMarkt</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Menge</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Zusatzkosten</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Gewinn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-border">
            {items.map((it) => {
              const ek = it.purchasePrice;
              const vp = avgSellPrice[it.sku];
              const extraStr = costs[it.sku] ?? "";
              const extra = extraStr !== "" ? parseFloat(extraStr.replace(",", ".")) : 0;
              const gewinn = vp != null && ek != null ? vp - ek - (isNaN(extra) ? 0 : extra) : null;

              return (
                <tr key={it.sku} className="hover:bg-grey-light/40">
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-brand-red">{it.sku}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-grey-dark">
                    {ek != null ? `${ek.toFixed(2)} €` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-grey-dark">
                    {vp != null ? `${vp.toFixed(2)} €` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-grey-dark">
                    {soldQty[it.sku] != null ? soldQty[it.sku] : "—"}
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
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums font-semibold">
                    {gewinn != null ? (
                      <span className={gewinn >= 0 ? "text-green-700" : "text-brand-red"}>
                        {gewinn.toFixed(2)} €
                      </span>
                    ) : (
                      <span className="text-grey-mid">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
