"use client";

import { useState, useTransition } from "react";
import { createInvoice } from "@/app/actions";

type LineItem = { pos: number; quantity: number; artNr: string; description: string; unitPrice: number; lager: string };
type Sku = { sku: string; stock: number; stockNS: number };

const today = new Date().toISOString().slice(0, 10);

export function InvoiceForm({ skus }: { skus: Sku[] }) {
  const [items, setItems] = useState<LineItem[]>([
    { pos: 1, quantity: 1, artNr: "", description: "", unitPrice: 0, lager: "neuware" },
  ]);
  const [mwstRate, setMwstRate] = useState(19);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function addItem() {
    setItems((prev) => [...prev, { pos: prev.length + 1, quantity: 1, artNr: "", description: "", unitPrice: 0, lager: "neuware" }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i).map((it, idx) => ({ ...it, pos: idx + 1 })));
  }

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  }

  function handleSkuChange(i: number, sku: string) {
    updateItem(i, "artNr", sku);
    if (!sku) return;
    const found = skus.find((s) => s.sku === sku);
    if (found && !items[i].description) updateItem(i, "description", sku);
  }

  const netto = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const mwst = netto * (mwstRate / 100);
  const brutto = netto + mwst;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = String(fd.get("date") ?? today);
    const customerName = String(fd.get("customerName") ?? "").trim();
    const customerAddress = String(fd.get("customerAddress") ?? "").trim();
    const customerNum = String(fd.get("customerNum") ?? "").trim();
    const notes = String(fd.get("notes") ?? "").trim();
    const paymentInfo = String(fd.get("paymentInfo") ?? "").trim();

    if (!customerName) { setError("Kundenname fehlt"); return; }
    if (items.some((it) => !it.description)) { setError("Alle Positionen brauchen eine Bezeichnung"); return; }

    setError("");
    startTransition(() => {
      createInvoice({ date, customerName, customerAddress, customerNum, mwstRate, notes, paymentInfo, items });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Kundendaten */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Datum</label>
          <input name="date" type="date" defaultValue={today}
            className="h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10" />
        </div>
        <div className="grid gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Kunden-Nr. (optional)</label>
          <input name="customerNum" type="text" placeholder="z.B. 18043"
            className="h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10" />
        </div>
        <div className="flex items-end gap-4">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid mr-2">MwSt.</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="mwst" value="19" checked={mwstRate === 19} onChange={() => setMwstRate(19)} className="accent-brand-red" />
            <span className="text-sm font-semibold">19 %</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="mwst" value="0" checked={mwstRate === 0} onChange={() => setMwstRate(0)} className="accent-brand-red" />
            <span className="text-sm font-semibold">0 % (steuerfrei)</span>
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Kundenname *</label>
          <input name="customerName" type="text" placeholder="Max Mustermann" required
            className="h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10" />
        </div>
        <div className="grid gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Adresse</label>
          <textarea name="customerAddress" rows={2} placeholder={"Musterstraße 1\n12345 Musterstadt"}
            className="rounded-lg border border-grey-border bg-white px-3 py-2 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10 resize-none" />
        </div>
      </div>

      {/* Positionen */}
      <div>
        <div className="mb-2 grid grid-cols-[2rem_6rem_1fr_8rem_6rem_5rem_2rem] gap-2 px-1">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Pos.</span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Art.-Nr. / SKU</span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Bezeichnung</span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Lager</span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid text-right">Menge</span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid text-right">E.-Preis €</span>
          <span />
        </div>

        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[2rem_6rem_1fr_8rem_6rem_6rem_2rem] gap-2 items-center">
              <span className="font-mono text-sm text-grey-mid text-center">{it.pos}.</span>
              <input
                value={it.artNr}
                onChange={(e) => handleSkuChange(i, e.target.value)}
                list="sku-list"
                placeholder="optional"
                className="h-9 rounded-lg border border-grey-border bg-white px-2 font-mono text-xs text-grey-dark focus:border-brand-red focus:outline-none"
              />
              <input
                value={it.description}
                onChange={(e) => updateItem(i, "description", e.target.value)}
                placeholder="Bezeichnung *"
                required
                className="h-9 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none"
              />
              <select
                value={it.lager}
                onChange={(e) => updateItem(i, "lager", e.target.value)}
                className="h-9 rounded-lg border border-grey-border bg-white px-2 text-xs text-grey-dark focus:border-brand-red focus:outline-none"
              >
                <option value="neuware">Neuware-Lager</option>
                <option value="ns">NS-Lager</option>
                <option value="">Kein Lager</option>
              </select>
              <input
                type="number"
                value={it.quantity}
                min={0.01}
                step={0.01}
                onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                className="h-9 rounded-lg border border-grey-border bg-white px-2 font-mono text-sm text-right tabular-nums text-grey-dark focus:border-brand-red focus:outline-none"
              />
              <input
                type="number"
                value={it.unitPrice}
                min={0}
                step={0.01}
                onChange={(e) => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                className="h-9 rounded-lg border border-grey-border bg-white px-2 font-mono text-sm text-right tabular-nums text-grey-dark focus:border-brand-red focus:outline-none"
              />
              <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1}
                className="h-9 w-9 rounded-lg border border-grey-border text-grey-mid hover:border-brand-red hover:text-brand-red disabled:opacity-30 text-xs">
                ✕
              </button>
            </div>
          ))}
        </div>

        <datalist id="sku-list">
          {skus.map((s) => <option key={s.sku} value={s.sku} />)}
        </datalist>

        <button type="button" onClick={addItem}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-grey-light px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:bg-grey-border transition-colors">
          + Position hinzufügen
        </button>
      </div>

      {/* Summen */}
      <div className="flex justify-end">
        <div className="w-64 space-y-1.5 rounded-lg border border-grey-border bg-grey-light p-4">
          <div className="flex justify-between font-mono text-sm text-grey-mid">
            <span>Gesamt Netto ({mwstRate} %)</span>
            <span className="tabular-nums">{netto.toFixed(2)} €</span>
          </div>
          {mwstRate > 0 && (
            <div className="flex justify-between font-mono text-sm text-grey-mid">
              <span>zzgl. MwSt ({mwstRate} %)</span>
              <span className="tabular-nums">{mwst.toFixed(2)} €</span>
            </div>
          )}
          <div className="flex justify-between border-t border-grey-border pt-2 font-mono text-sm font-bold text-grey-dark">
            <span>Rechnungsbetrag</span>
            <span className="tabular-nums">{brutto.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* Notiz + Zahlungsinfo */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Notiz (erscheint auf Rechnung)</label>
          <textarea name="notes" rows={2} placeholder="z.B. Angebots-Nr., Lieferbedingungen ..."
            className="rounded-lg border border-grey-border bg-white px-3 py-2 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10 resize-none" />
        </div>
        <div className="grid gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Zahlungsinfo (optional)</label>
          <textarea name="paymentInfo" rows={2} placeholder="z.B. Zahlung (eBay Managed Payments) vom 07.06.2026 529,00 €"
            className="rounded-lg border border-grey-border bg-white px-3 py-2 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10 resize-none" />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-brand-red/20 bg-brand-red/5 px-4 py-3 font-mono text-sm text-brand-red">{error}</div>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={isPending}
          className="rounded-lg bg-brand-red px-6 py-2.5 font-mono text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-50 transition-colors">
          {isPending ? "Wird erstellt…" : "Rechnung erstellen"}
        </button>
      </div>
    </form>
  );
}
