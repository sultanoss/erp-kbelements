"use client";

import { useState, useTransition } from "react";
import { createDeliveryNote } from "./actions";

type Item = { sku: string; name: string };

export function NeuerLieferscheinForm({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<{ sku: string; quantity: number }[]>([{ sku: "", quantity: 1 }]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const skuMap = new Map(items.map(i => [i.sku, i.name]));

  function addLine() {
    setLines(prev => [...prev, { sku: "", quantity: 1 }]);
  }

  function removeLine(idx: number) {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: "sku" | "quantity", value: string | number) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  function handleSubmit() {
    setError(null);
    const validLines = lines.filter(l => l.sku && l.quantity > 0);
    if (validLines.length === 0) { setError("Mindestens eine gültige Position erforderlich"); return; }
    const unknownSku = validLines.find(l => !skuMap.has(l.sku));
    if (unknownSku) { setError(`Unbekannte SKU: ${unknownSku.sku}`); return; }

    startTransition(async () => {
      try {
        await createDeliveryNote(pickupDate, notes, validLines);
        setOpen(false);
        setLines([{ sku: "", quantity: 1 }]);
        setNotes("");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Fehler beim Speichern");
      }
    });
  }

  const inputCls = "rounded-lg border border-grey-border bg-white px-3 py-2 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand-red px-4 py-2.5 font-mono text-sm font-semibold text-white hover:bg-brand-red-dark transition-colors"
      >
        + Neuer Lieferschein
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-grey-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="border-l-2 border-brand-red pl-3 font-mono text-sm font-bold text-grey-dark">
          Neuer Lieferschein an AIT
        </h2>
        <button onClick={() => setOpen(false)} className="font-mono text-xs text-grey-mid hover:text-grey-dark">
          ✕ Abbrechen
        </button>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-grey-mid">
            Abholdatum
          </label>
          <input
            type="date"
            value={pickupDate}
            onChange={e => setPickupDate(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-grey-mid">
            Bemerkungen (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="z.B. 2 Paletten"
            className={`${inputCls} w-full`}
          />
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-grey-mid">Positionen</span>
          <button
            type="button"
            onClick={addLine}
            className="font-mono text-xs text-brand-red hover:underline"
          >
            + Zeile hinzufügen
          </button>
        </div>
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={line.sku}
                onChange={e => updateLine(idx, "sku", e.target.value)}
                className={`${inputCls} flex-1`}
              >
                <option value="">SKU auswählen…</option>
                {items.map(item => (
                  <option key={item.sku} value={item.sku}>
                    {item.sku} — {item.name || "Kein Name"}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={line.quantity}
                onChange={e => updateLine(idx, "quantity", parseInt(e.target.value) || 1)}
                className={`${inputCls} w-20`}
              />
              <span className="font-mono text-xs text-grey-mid">Stück</span>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="font-mono text-xs text-grey-mid hover:text-brand-red"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-brand-red/30 bg-brand-red/5 px-3 py-2 font-mono text-xs text-brand-red">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={pending}
          className="rounded-lg bg-brand-red px-4 py-2.5 font-mono text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-50 transition-colors"
        >
          {pending ? "Wird gespeichert…" : "Lieferschein erstellen"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-grey-border px-4 py-2.5 font-mono text-sm text-grey-mid hover:text-grey-dark transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
