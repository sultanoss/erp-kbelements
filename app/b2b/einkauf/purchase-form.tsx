"use client";

import { useState, useTransition } from "react";
import { savePurchaseOrder, undoPurchaseOrder } from "./actions";

type ItemInfo = {
  sku: string;
  name: string;
  stock: number;
  purchasePrice: number | null;
};

type LineItem = {
  id: number;
  sku: string;
  quantity: number;
  purchasePrice: number;
  currentAvgPrice: number;
  currentStock: number;
};

type LastSave = {
  purchaseOrderId: string;
  supplier: string;
  invoiceNumber: string;
  itemsUpdated: number;
};

function newLine(id: number): LineItem {
  return { id, sku: "", quantity: 1, purchasePrice: 0, currentAvgPrice: 0, currentStock: 0 };
}

function calcNewStock(currentStock: number, qty: number) {
  return currentStock + qty;
}

function calcNewAvg(currentStock: number, currentAvgPrice: number, newPrice: number, qty: number) {
  const newStock = currentStock + qty;
  if (newStock === 0) return newPrice;
  if (currentStock > 0 && currentAvgPrice > 0) {
    return (currentStock * currentAvgPrice + qty * newPrice) / newStock;
  }
  return newPrice;
}

const labelClass = "mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid";
const inputClass =
  "h-9 w-full rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10";
const readonlyClass =
  "flex h-9 items-center rounded-lg border border-grey-border bg-grey-light px-3 font-mono text-sm tabular-nums text-grey-dark";

export function PurchaseForm({ allItems }: { allItems: ItemInfo[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Form fields
  const [date, setDate] = useState(today);
  const [supplier, setSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [nextId, setNextId] = useState(1);

  // Last saved order — stays visible until undone or a new save overwrites it
  const [lastSave, setLastSave] = useState<LastSave | null>(null);
  const [undoDone, setUndoDone] = useState(false);

  const itemMap = Object.fromEntries(allItems.map((i) => [i.sku, i]));

  function addLine() {
    setLines((prev) => [...prev, newLine(nextId)]);
    setNextId((n) => n + 1);
  }

  function removeLine(id: number) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLine(id: number, field: keyof LineItem, value: string | number) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        if (field === "sku") {
          const item = itemMap[value as string];
          return {
            ...l,
            sku: value as string,
            currentAvgPrice: item?.purchasePrice ?? 0,
            currentStock: item?.stock ?? 0,
          };
        }
        return { ...l, [field]: value };
      })
    );
  }

  function resetForm() {
    setDate(today);
    setSupplier("");
    setInvoiceNumber("");
    setNotes("");
    setLines([]);
    setNextId((n) => n + 1);
    setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!supplier.trim()) return setError("Lieferant ist erforderlich.");
    if (!invoiceNumber.trim()) return setError("Rechnungsnummer ist erforderlich.");
    const validLines = lines.filter((l) => l.sku && itemMap[l.sku]);
    if (validLines.length === 0) return setError("Mindestens ein Artikel mit gültiger SKU.");
    if (validLines.some((l) => l.quantity <= 0)) return setError("Menge muss größer als 0 sein.");
    if (validLines.some((l) => l.purchasePrice <= 0)) return setError("Einkaufspreis muss größer als 0 sein.");

    const savedSupplier = supplier;
    const savedInvoice = invoiceNumber;

    startTransition(async () => {
      const result = await savePurchaseOrder({
        date,
        supplier: savedSupplier,
        invoiceNumber: savedInvoice,
        notes: notes || undefined,
        items: validLines.map((l) => ({
          sku: l.sku,
          quantity: l.quantity,
          purchasePrice: l.purchasePrice,
        })),
      });
      setLastSave({
        purchaseOrderId: result.purchaseOrderId,
        supplier: savedSupplier,
        invoiceNumber: savedInvoice,
        itemsUpdated: result.itemsUpdated,
      });
      setUndoDone(false);
      resetForm();
    });
  }

  function handleUndo() {
    if (!lastSave) return;
    startTransition(async () => {
      await undoPurchaseOrder(lastSave.purchaseOrderId);
      setLastSave(null);
      setUndoDone(true);
    });
  }

  return (
    <div className="space-y-6">

      {/* Rückgängig-Banner */}
      {lastSave && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-green-200 bg-green-50 px-5 py-3.5">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-green-800 text-sm">
              ✓ {lastSave.itemsUpdated} Artikel aktualisiert
            </div>
            <div className="font-mono text-xs text-green-600 mt-0.5">
              {lastSave.supplier} · {lastSave.invoiceNumber}
            </div>
          </div>
          <button
            onClick={handleUndo}
            disabled={isPending}
            className="shrink-0 rounded-lg border border-green-300 bg-white px-4 py-2 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red disabled:opacity-50 transition-colors"
          >
            ↩ Rückgängig
          </button>
        </div>
      )}

      {undoDone && !lastSave && (
        <div className="rounded-xl border border-grey-border bg-grey-light px-5 py-3 font-mono text-sm text-grey-mid">
          Wareneinkauf wurde rückgängig gemacht.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className={labelClass}>Rechnungsdatum</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Lieferant</label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Lieferantenname"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Rechnungsnummer</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="RE-2024-001"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Bemerkung (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>
        </div>

        {/* Article rows — only rendered when lines exist */}
        {lines.length > 0 && (
          <div className="space-y-2">
            <div className="hidden grid-cols-[2fr_6rem_8rem_7rem_6rem_7rem_8rem_2rem] gap-2 md:grid">
              {["SKU / Artikelname", "Akt. Bestand", "Akt. Ø-Preis (€)", "Neuer EP (€)", "Menge", "Neuer Bestand", "Neuer Ø-Preis", ""].map(
                (h, i) => (
                  <div key={i} className={labelClass}>{h}</div>
                )
              )}
            </div>

            {lines.map((line) => {
              const item = itemMap[line.sku];
              const newStock = calcNewStock(line.currentStock, line.quantity);
              const newAvg =
                line.purchasePrice > 0
                  ? calcNewAvg(line.currentStock, line.currentAvgPrice, line.purchasePrice, line.quantity)
                  : null;

              return (
                <div
                  key={line.id}
                  className="grid grid-cols-1 gap-2 rounded-lg border border-grey-border bg-white p-3 md:grid-cols-[2fr_6rem_8rem_7rem_6rem_7rem_8rem_2rem] md:items-center md:rounded-none md:border-0 md:bg-transparent md:p-0"
                >
                  <div className="flex flex-col gap-1">
                    <select
                      value={line.sku}
                      onChange={(e) => updateLine(line.id, "sku", e.target.value)}
                      className={inputClass}
                    >
                      <option value="">— SKU wählen —</option>
                      {allItems.map((i) => (
                        <option key={i.sku} value={i.sku}>
                          {i.sku}{i.name ? ` — ${i.name}` : ""}
                        </option>
                      ))}
                    </select>
                    {item?.name && (
                      <span className="pl-1 font-mono text-[10px] text-grey-mid truncate">{item.name}</span>
                    )}
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={line.currentStock}
                    onChange={(e) => updateLine(line.id, "currentStock", parseInt(e.target.value) || 0)}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={line.currentAvgPrice || ""}
                    onChange={(e) => updateLine(line.id, "currentAvgPrice", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={line.purchasePrice || ""}
                    onChange={(e) => updateLine(line.id, "purchasePrice", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={line.quantity}
                    onChange={(e) => updateLine(line.id, "quantity", parseInt(e.target.value) || 1)}
                    className={inputClass}
                  />
                  <div className={readonlyClass + " justify-center font-semibold text-green-700"}>
                    {newStock}
                  </div>
                  <div className={readonlyClass + " justify-center"}>
                    {newAvg != null ? `${newAvg.toFixed(2)} €` : "–"}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-grey-border text-grey-mid hover:border-brand-red hover:text-brand-red"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addLine}
            className="rounded-lg border border-grey-border px-4 py-2 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red"
          >
            + Artikel hinzufügen
          </button>

          {lines.length > 0 && (
            <div className="ml-auto flex items-center gap-3">
              {error && <span className="font-mono text-xs text-brand-red">{error}</span>}
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-brand-red px-6 py-2.5 font-semibold text-white hover:bg-brand-red/90 disabled:opacity-50"
              >
                {isPending ? "Wird gespeichert…" : "Lager aktualisieren"}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
