"use client";

import { useState, useTransition } from "react";
import { updatePurchasePrice, addPriceColumn, deletePriceColumn, updateColumnValue } from "./actions";

type Column = { id: string; title: string; order: number };
type ColumnValue = { priceColumnId: string; price: number | null };
type Row = {
  sku: string;
  name: string;
  purchasePrice: number | null;
  columnValues: ColumnValue[];
};

type CellKey = string; // "ep|{sku}" or "col|{colId}|{sku}"

function fmt(v: number | null): string {
  if (v == null) return "";
  return parseFloat(v.toFixed(2)).toString();
}

function parsePrice(v: string): number | null {
  const s = v.trim().replace(",", ".");
  if (!s) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function buildValues(rows: Row[], cols: Column[]) {
  const map: Record<CellKey, string> = {};
  for (const r of rows) {
    map[`ep|${r.sku}`] = fmt(r.purchasePrice);
    for (const col of cols) {
      const cv = r.columnValues.find((v) => v.priceColumnId === col.id);
      map[`col|${col.id}|${r.sku}`] = fmt(cv?.price ?? null);
    }
  }
  return map;
}

// ---------- sub-components ----------

const inputBase =
  "h-9 w-full rounded-md border px-2 font-mono text-sm tabular-nums text-grey-dark placeholder:text-grey-mid/40 focus:outline-none focus:ring-2 transition-colors";

function Cell({
  cellKey,
  value,
  savedValue,
  onChange,
}: {
  cellKey: string;
  value: string;
  savedValue: string;
  onChange: (key: CellKey, val: string) => void;
}) {
  const dirty = value !== savedValue;
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      placeholder="–"
      onChange={(e) => onChange(cellKey, e.target.value)}
      className={
        inputBase +
        (dirty
          ? " border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-200"
          : " border-transparent bg-transparent hover:border-grey-border focus:border-brand-red focus:bg-white focus:ring-brand-red/10")
      }
    />
  );
}

function AddColumnForm({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [, start] = useTransition();

  function submit() {
    if (!title.trim()) return;
    start(async () => {
      await onAdd(title.trim());
      setTitle("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="h-9 rounded-md border border-dashed border-grey-border px-3 font-mono text-xs font-semibold text-grey-mid hover:border-brand-red hover:text-brand-red transition-colors whitespace-nowrap"
      >
        + Spalte
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") { setTitle(""); setOpen(false); }
        }}
        placeholder="Spaltenname…"
        className="h-9 w-28 rounded-md border border-brand-red bg-white px-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-red/10"
      />
      <button onClick={submit} className="h-9 rounded-md bg-brand-red px-3 font-mono text-xs font-semibold text-white hover:bg-brand-red/90">OK</button>
      <button onClick={() => { setTitle(""); setOpen(false); }} className="h-9 rounded-md border border-grey-border px-2 font-mono text-xs text-grey-mid hover:text-brand-red">✕</button>
    </div>
  );
}

// ---------- main component ----------

export function PriceTable({
  initialRows,
  initialColumns,
}: {
  initialRows: Row[];
  initialColumns: Column[];
}) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [values, setValues] = useState<Record<CellKey, string>>(() => buildValues(initialRows, initialColumns));
  const [saved, setSaved] = useState<Record<CellKey, string>>(() => buildValues(initialRows, initialColumns));
  const [isSaving, startSaving] = useTransition();
  const [saveResult, setSaveResult] = useState<"ok" | "error" | null>(null);

  const dirtyKeys = Object.keys(values).filter((k) => values[k] !== (saved[k] ?? ""));
  const dirtyCount = dirtyKeys.length;

  function handleChange(key: CellKey, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setSaveResult(null);
  }

  function handleSaveAll() {
    startSaving(async () => {
      try {
        for (const key of dirtyKeys) {
          const price = parsePrice(values[key]);
          if (key.startsWith("ep|")) {
            const sku = key.slice(3);
            await updatePurchasePrice(sku, price);
          } else {
            const parts = key.split("|");
            const colId = parts[1];
            const sku = parts[2];
            await updateColumnValue(colId, sku, price);
          }
        }
        setSaved((prev) => {
          const next = { ...prev };
          for (const k of dirtyKeys) next[k] = values[k];
          return next;
        });
        setSaveResult("ok");
        setTimeout(() => setSaveResult(null), 2500);
      } catch {
        setSaveResult("error");
      }
    });
  }

  async function handleAddColumn(title: string) {
    const newCol = await addPriceColumn(title);
    setColumns((prev) => [...prev, newCol]);
    // initialize empty values for new column
    const newEntries: Record<CellKey, string> = {};
    for (const row of initialRows) {
      newEntries[`col|${newCol.id}|${row.sku}`] = "";
    }
    setValues((prev) => ({ ...prev, ...newEntries }));
    setSaved((prev) => ({ ...prev, ...newEntries }));
  }

  async function handleDeleteColumn(id: string) {
    const colTitle = columns.find((c) => c.id === id)?.title;
    if (!confirm(`Spalte "${colTitle}" und alle Preise darin löschen?`)) return;
    await deletePriceColumn(id);
    setColumns((prev) => prev.filter((c) => c.id !== id));
    setValues((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (k.startsWith(`col|${id}|`)) delete next[k];
      return next;
    });
    setSaved((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (k.startsWith(`col|${id}|`)) delete next[k];
      return next;
    });
  }

  const thClass = "px-3 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-grey-mid whitespace-nowrap";
  const tdClass = "px-1 py-0.5";

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 border-b border-grey-border px-4 py-3">
        <div className="font-mono text-xs text-grey-mid">
          {dirtyCount > 0 ? (
            <span className="font-semibold text-amber-600">● {dirtyCount} ungespeicherte Änderung{dirtyCount !== 1 ? "en" : ""}</span>
          ) : saveResult === "ok" ? (
            <span className="font-semibold text-green-600">✓ Alle Änderungen gespeichert</span>
          ) : (
            <span>Felder bearbeiten, dann „Speichern" klicken</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/preisliste/export"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-grey-border px-4 font-mono text-xs font-semibold text-grey-dark hover:border-grey-dark transition-colors"
          >
            ↓ Excel
          </a>
          <button
            onClick={handleSaveAll}
            disabled={dirtyCount === 0 || isSaving}
            className="flex h-9 items-center rounded-lg bg-brand-red px-5 font-mono text-xs font-semibold text-white hover:bg-brand-red/90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {isSaving ? "Wird gespeichert…" : `Speichern${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-grey-border bg-grey-light/60">
              <th className={thClass + " w-28"}>SKU</th>
              <th className={thClass}>Artikelname</th>
              <th className={thClass + " w-40"}>Akt. Ø-Preis (€)</th>
              {columns.map((col) => (
                <th key={col.id} className={thClass + " w-40"}>
                  <div className="group flex items-center gap-1.5">
                    <span>{col.title}</span>
                    <button
                      onClick={() => handleDeleteColumn(col.id)}
                      className="opacity-0 group-hover:opacity-100 text-grey-mid/60 hover:text-brand-red transition-opacity text-[10px] leading-none"
                      title="Spalte löschen"
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
              <th className={thClass}>
                <AddColumnForm onAdd={handleAddColumn} />
              </th>
            </tr>
          </thead>
          <tbody>
            {initialRows.map((row, i) => (
              <tr key={row.sku} className={i % 2 === 0 ? "bg-white" : "bg-grey-light/30"}>
                <td className="px-3 py-1 font-mono text-xs font-semibold text-grey-dark whitespace-nowrap">
                  {row.sku}
                </td>
                <td className="px-3 py-1 font-mono text-xs text-grey-mid max-w-[220px] truncate">
                  {row.name || "–"}
                </td>
                <td className={tdClass}>
                  <Cell
                    cellKey={`ep|${row.sku}`}
                    value={values[`ep|${row.sku}`] ?? ""}
                    savedValue={saved[`ep|${row.sku}`] ?? ""}
                    onChange={handleChange}
                  />
                </td>
                {columns.map((col) => (
                  <td key={col.id} className={tdClass}>
                    <Cell
                      cellKey={`col|${col.id}|${row.sku}`}
                      value={values[`col|${col.id}|${row.sku}`] ?? ""}
                      savedValue={saved[`col|${col.id}|${row.sku}`] ?? ""}
                      onChange={handleChange}
                    />
                  </td>
                ))}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
        {initialRows.length === 0 && (
          <div className="py-12 text-center font-mono text-sm text-grey-mid">Keine Artikel gefunden.</div>
        )}
      </div>
    </div>
  );
}
