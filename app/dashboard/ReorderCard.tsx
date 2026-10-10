"use client";

import { useState, useTransition } from "react";
import { Panel } from "@/components/ui";
import { addUnterwegs, upsertChinaLager, deleteIncoming } from "./reorder-actions";

type ReorderRow = { sku: string; totalStock: number; weeklyAvg: number; daysLeft: number | null };
type Incoming = { id: string; sku: string; type: string; quantity: number; arrivalDate: Date | null };

export function ReorderCard({ rows, incoming }: { rows: ReorderRow[]; incoming: Incoming[] }) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  // Per-SKU UI state
  const [addingUnterwegs, setAddingUnterwegs] = useState<string | null>(null);
  const [editingChina, setEditingChina] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newQty, setNewQty] = useState("");
  const [chinaQty, setChinaQty] = useState("");

  const urgentCount = rows.filter((r) => r.daysLeft !== null && r.daysLeft < 60).length;
  const filtered = query.trim()
    ? rows.filter((r) => r.sku.toLowerCase().includes(query.trim().toLowerCase()))
    : rows;

  function formatDate(d: Date | null) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function handleAddUnterwegs(sku: string) {
    if (!newDate || !newQty || parseInt(newQty) <= 0) return;
    startTransition(async () => {
      await addUnterwegs(sku, parseInt(newQty), newDate);
      setAddingUnterwegs(null);
      setNewDate("");
      setNewQty("");
    });
  }

  function handleUpsertChina(sku: string) {
    startTransition(async () => {
      await upsertChinaLager(sku, parseInt(chinaQty) || 0);
      setEditingChina(null);
      setChinaQty("");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteIncoming(id);
    });
  }

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

        {/* Suchfeld */}
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
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-4 text-center font-mono text-xs text-grey-mid">Keine SKU gefunden.</td></tr>
              ) : filtered.map((r) => {
                const urgent = r.daysLeft !== null && r.daysLeft < 60;
                const ok = r.daysLeft !== null && r.daysLeft >= 60;
                const unterwegs = incoming.filter((i) => i.sku === r.sku && i.type === "UNTERWEGS");
                const china = incoming.find((i) => i.sku === r.sku && i.type === "CHINA_LAGER");
                const isAddingThis = addingUnterwegs === r.sku;
                const isEditingChina = editingChina === r.sku;

                return (
                  <>
                    {/* Hauptzeile */}
                    <tr key={r.sku} className="border-t border-grey-border">
                      <td className={`px-5 py-2 font-mono text-sm font-semibold ${urgent ? "text-brand-red" : "text-grey-dark"}`}>{r.sku}</td>
                      <td className="px-5 py-2 text-right font-mono tabular-nums text-sm text-grey-dark">{r.totalStock} Stk.</td>
                      <td className="px-5 py-2 text-right font-mono tabular-nums text-sm text-grey-dark">{r.weeklyAvg} Stk.</td>
                      <td className={`px-5 py-2 text-right font-mono tabular-nums text-sm font-bold ${urgent ? "text-brand-red" : ok ? "text-green-600" : "text-grey-mid"}`}>
                        {r.daysLeft !== null ? `${r.daysLeft} Tage` : "—"}
                      </td>
                    </tr>

                    {/* Unterwegs-Einträge */}
                    {unterwegs.map((u) => (
                      <tr key={u.id} className="bg-grey-light/20">
                        <td colSpan={3} className="px-5 py-1 font-mono text-xs text-grey-mid">
                          ↳ <span className="font-semibold text-grey-dark">Unterwegs:</span> {u.quantity} Stk. — Ankunft {formatDate(u.arrivalDate)}
                        </td>
                        <td className="px-5 py-1 text-right">
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={pending}
                            className="font-mono text-[10px] text-brand-red hover:underline disabled:opacity-50"
                          >✕ Löschen</button>
                        </td>
                      </tr>
                    ))}

                    {/* China-Lager-Eintrag */}
                    <tr className="bg-grey-light/20">
                      <td colSpan={3} className="px-5 py-1 font-mono text-xs text-grey-mid">
                        ↳ <span className="font-semibold text-grey-dark">China-Lager:</span>{" "}
                        {isEditingChina ? (
                          <span className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={chinaQty}
                              onChange={(e) => setChinaQty(e.target.value)}
                              placeholder={china ? String(china.quantity) : "0"}
                              className="w-20 rounded border border-grey-border px-2 py-0.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-brand-red"
                              autoFocus
                            />
                            <span className="text-grey-mid">Stk.</span>
                            <button onClick={() => handleUpsertChina(r.sku)} disabled={pending} className="font-mono text-[10px] text-green-600 hover:underline disabled:opacity-50">✓ Speichern</button>
                            <button onClick={() => { setEditingChina(null); setChinaQty(""); }} className="font-mono text-[10px] text-grey-mid hover:underline">Abbrechen</button>
                          </span>
                        ) : (
                          <span>{china ? `${china.quantity} Stk.` : "—"}</span>
                        )}
                      </td>
                      <td className="px-5 py-1 text-right">
                        {!isEditingChina && (
                          <button
                            onClick={() => { setEditingChina(r.sku); setChinaQty(china ? String(china.quantity) : ""); }}
                            className="font-mono text-[10px] text-grey-mid hover:text-grey-dark hover:underline"
                          >✎ Bearbeiten</button>
                        )}
                      </td>
                    </tr>

                    {/* Neue Ankunft hinzufügen */}
                    {isAddingThis ? (
                      <tr className="bg-amber-50/50">
                        <td colSpan={4} className="px-5 py-2">
                          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                            <span className="text-grey-mid">Ankunft:</span>
                            <input
                              type="date"
                              value={newDate}
                              onChange={(e) => setNewDate(e.target.value)}
                              className="rounded border border-grey-border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-brand-red"
                            />
                            <input
                              type="number"
                              min="1"
                              value={newQty}
                              onChange={(e) => setNewQty(e.target.value)}
                              placeholder="Menge"
                              className="w-24 rounded border border-grey-border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-brand-red"
                            />
                            <span className="text-grey-mid">Stk.</span>
                            <button onClick={() => handleAddUnterwegs(r.sku)} disabled={pending || !newDate || !newQty} className="rounded bg-brand-red px-2 py-1 font-mono text-[10px] font-bold text-white disabled:opacity-50">Speichern</button>
                            <button onClick={() => { setAddingUnterwegs(null); setNewDate(""); setNewQty(""); }} className="font-mono text-[10px] text-grey-mid hover:underline">Abbrechen</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr className="border-b border-grey-border bg-grey-light/10">
                        <td colSpan={4} className="px-5 py-1">
                          <button
                            onClick={() => setAddingUnterwegs(r.sku)}
                            className="font-mono text-[10px] text-grey-mid hover:text-brand-red hover:underline"
                          >＋ Ankunft hinzufügen</button>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </Panel>
  );
}
