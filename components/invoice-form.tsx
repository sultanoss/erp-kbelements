"use client";

import { useState, useTransition } from "react";
import { createInvoice } from "@/app/actions";

type SkuEntry = { id: number; sku: string; lager: string };
type LineItem = { id: number; pos: number; quantity: number; description: string; unitPrice: number; skus: SkuEntry[] };
type SkuData = { sku: string; name: string; stock: number; stockNS: number };

const today = new Date().toISOString().slice(0, 10);
let nextId = 1;
let nextSkuId = 1;

function newLine(pos: number): LineItem {
  return { id: nextId++, pos, quantity: 1, description: "", unitPrice: 0, skus: [{ id: nextSkuId++, sku: "", lager: "neuware" }] };
}

export function InvoiceForm({ skus }: { skus: SkuData[] }) {
  const [items, setItems] = useState<LineItem[]>([newLine(1)]);
  const [mwstRate, setMwstRate] = useState(19);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function addItem() {
    setItems((prev) => [...prev, newLine(prev.length + 1)]);
  }

  function removeItem(id: number) {
    setItems((prev) => {
      if (prev.length === 1) return [newLine(1)];
      return prev.filter((it) => it.id !== id).map((it, i) => ({ ...it, pos: i + 1 }));
    });
  }

  function updateItem(id: number, field: "quantity" | "description" | "unitPrice", value: string | number) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, [field]: value } : it));
  }

  function addSku(itemId: number) {
    setItems((prev) => prev.map((it) =>
      it.id === itemId
        ? { ...it, description: "", skus: [...it.skus, { id: nextSkuId++, sku: "", lager: "neuware" }] }
        : it
    ));
  }

  function removeSku(itemId: number, skuId: number) {
    setItems((prev) => prev.map((it) =>
      it.id === itemId ? { ...it, skus: it.skus.filter((s) => s.id !== skuId) } : it
    ));
  }

  function updateSku(itemId: number, skuId: number, field: "sku" | "lager", value: string) {
    setItems((prev) => prev.map((it) => {
      if (it.id !== itemId) return it;
      const idx = it.skus.findIndex((s) => s.id === skuId);
      const updatedSkus = it.skus.map((s) => s.id === skuId ? { ...s, [field]: value } : s);
      // Auto-fill description only when this is the sole SKU in the position
      if (field === "sku" && idx === 0 && value && !it.description && it.skus.length === 1) {
        const found = skus.find((s) => s.sku === value);
        if (found?.name) return { ...it, skus: updatedSkus, description: found.name };
      }
      return { ...it, skus: updatedSkus };
    }));
  }

  const bruttoSum = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const netto = mwstRate > 0 ? bruttoSum / (1 + mwstRate / 100) : bruttoSum;
  const mwstAmt = bruttoSum - netto;

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
      createInvoice({
        date, customerName, customerAddress, customerNum, mwstRate, notes, paymentInfo,
        items: items.map((it) => ({
          pos: it.pos,
          quantity: it.quantity,
          description: it.description,
          unitPrice: it.unitPrice,
          skus: it.skus.filter((s) => s.sku).map((s) => ({ sku: s.sku, lager: s.lager })),
        })),
      });
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
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">MwSt.</span>
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
        <div className="mb-2 grid grid-cols-[2rem_1fr_1fr_5rem_7rem_2.5rem] gap-2 border-b border-grey-border pb-2 px-1">
          <span className="text-xs font-bold text-grey-dark">Pos.</span>
          <span className="text-xs font-bold text-grey-dark">Art.-Nr. / Lager</span>
          <span className="text-xs font-bold text-grey-dark">Bezeichnung</span>
          <span className="text-xs font-bold text-grey-dark text-right">Menge</span>
          <span className="text-xs font-bold text-grey-dark text-right">Preis (Brutto)</span>
          <span />
        </div>

        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="grid grid-cols-[2rem_1fr_1fr_5rem_7rem_2.5rem] gap-2 items-start">
              {/* Pos */}
              <span className="pt-2 font-mono text-sm text-grey-mid text-center">{it.pos}.</span>

              {/* SKU Section — stacked entries */}
              <div className="space-y-1">
                {it.skus.map((s, idx) => {
                  const found = skus.find((sk) => sk.sku === s.sku);
                  return (
                    <div key={s.id}>
                      <div className="flex gap-1 items-center">
                        <input
                          value={s.sku}
                          onChange={(e) => updateSku(it.id, s.id, "sku", e.target.value)}
                          list="sku-list"
                          placeholder="Art.-Nr."
                          className="h-8 min-w-0 flex-1 rounded-lg border border-grey-border bg-white px-2 font-mono text-xs text-grey-dark focus:border-brand-red focus:outline-none"
                        />
                        <select
                          value={s.lager}
                          onChange={(e) => updateSku(it.id, s.id, "lager", e.target.value)}
                          className="h-8 w-[7rem] shrink-0 rounded-lg border border-grey-border bg-white px-1 text-xs text-grey-dark focus:border-brand-red focus:outline-none"
                        >
                          <option value="neuware">Neuware</option>
                          <option value="ns">NS-Lager</option>
                          <option value="">Kein Lager</option>
                        </select>
                        {it.skus.length > 1 && (
                          <button type="button" onClick={() => removeSku(it.id, s.id)}
                            className="h-8 w-7 shrink-0 rounded border border-grey-border text-grey-mid hover:border-brand-red hover:text-brand-red text-xs flex items-center justify-center">
                            ✕
                          </button>
                        )}
                      </div>
                      {found && (
                        <div className="ml-1 mt-0.5 flex gap-3 font-mono text-[10px]">
                          <span className="text-grey-dark">Neuware-Lager: <strong>{found.stock}</strong></span>
                          <span className="text-grey-dark">NS-Lager: <strong>{found.stockNS}</strong></span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button type="button" onClick={() => addSku(it.id)}
                  className="mt-1 inline-flex items-center gap-1 rounded border border-grey-border bg-grey-light px-2 py-0.5 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors">
                  + weitere Art.-Nr.
                </button>
              </div>

              {/* Bezeichnung */}
              <input
                value={it.description}
                onChange={(e) => updateItem(it.id, "description", e.target.value)}
                placeholder="Bezeichnung *"
                required
                className="h-8 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none"
              />

              {/* Menge */}
              <input
                type="number"
                value={it.quantity}
                min={0.01}
                step={0.01}
                onChange={(e) => updateItem(it.id, "quantity", parseFloat(e.target.value) || 0)}
                className="h-8 rounded-lg border border-grey-border bg-white px-2 font-mono text-sm text-right tabular-nums text-grey-dark focus:border-brand-red focus:outline-none"
              />

              {/* Preis */}
              <input
                type="number"
                value={it.unitPrice}
                min={0}
                step={0.01}
                onChange={(e) => updateItem(it.id, "unitPrice", parseFloat(e.target.value) || 0)}
                className="h-8 rounded-lg border border-grey-border bg-white px-2 font-mono text-sm text-right tabular-nums text-grey-dark focus:border-brand-red focus:outline-none"
              />

              {/* Zeile löschen */}
              <button type="button" onClick={() => removeItem(it.id)}
                className="mt-0.5 h-8 w-9 rounded-lg border border-grey-border text-grey-mid hover:border-brand-red hover:text-brand-red text-xs flex items-center justify-center">
                ✕
              </button>
            </div>
          ))}
        </div>

        <datalist id="sku-list">
          {skus.map((s) => <option key={s.sku} value={s.sku} label={s.name} />)}
        </datalist>

        <button type="button" onClick={addItem}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-grey-light px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:bg-grey-border transition-colors">
          + Position hinzufügen
        </button>
      </div>

      {/* Summen */}
      <div className="flex justify-end">
        <div className="w-72 space-y-1.5 rounded-lg border border-grey-border bg-grey-light p-4">
          <div className="flex justify-between font-mono text-sm text-grey-mid">
            <span>Gesamt Netto ({mwstRate} %)</span>
            <span className="tabular-nums">{netto.toFixed(2)} €</span>
          </div>
          {mwstRate > 0 && (
            <div className="flex justify-between font-mono text-sm text-grey-mid">
              <span>zzgl. MwSt ({mwstRate} %)</span>
              <span className="tabular-nums">{mwstAmt.toFixed(2)} €</span>
            </div>
          )}
          <div className="flex justify-between border-t border-grey-border pt-2 font-mono text-sm font-bold text-grey-dark">
            <span>Rechnungsbetrag</span>
            <span className="tabular-nums">{bruttoSum.toFixed(2)} €</span>
          </div>
          {mwstRate > 0 && (
            <p className="font-mono text-[10px] text-grey-mid pt-1">* Eingegebene Preise sind Bruttopreise inkl. {mwstRate} % MwSt.</p>
          )}
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
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Zahlungsinformation *</label>
          <textarea name="paymentInfo" rows={2} required
            placeholder="z.B. Zahlung (eBay Managed Payments) vom 07.06.2026 529,00 €"
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
