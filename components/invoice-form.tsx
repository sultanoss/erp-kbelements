"use client";

import { useState, useTransition, useRef } from "react";
import { createInvoice, updateInvoice } from "@/app/actions";

type DocType = "rechnung" | "angebot" | "gutschrift";

type SkuEntry = { id: number; sku: string; lager: string };
type LineItem = { id: number; pos: number; quantity: number; description: string; unitPrice: number; skus: SkuEntry[] };
type SkuData = { sku: string; name: string; stock: number; stockNS: number };

export type InvoiceInitialData = {
  invoiceId?: string;
  date: string;
  customerName: string;
  customerAddress: string;
  customerNum: string;
  mwstRate: number;
  shippingCost: string;
  shippingMwst: number;
  paymentMethod: "konto" | "bar";
  paymentInfo: string;
  notes: string;
  items: LineItem[];
};

const today = new Date().toISOString().slice(0, 10);
let nextId = 1;
let nextSkuId = 1;

function newLine(pos: number): LineItem {
  return { id: nextId++, pos, quantity: 1, description: "", unitPrice: 0, skus: [{ id: nextSkuId++, sku: "", lager: "neuware" }] };
}

export function InvoiceForm({ skus, initialData, docType = "rechnung", originalInvoiceId, originalInvoiceNum }: { skus: SkuData[]; initialData?: InvoiceInitialData; docType?: DocType; originalInvoiceId?: string; originalInvoiceNum?: string }) {
  const [items, setItems] = useState<LineItem[]>(initialData?.items ?? [newLine(1)]);
  const [mwstRate, setMwstRate] = useState(initialData?.mwstRate ?? 19);
  const [shippingCost, setShippingCost] = useState<string>(initialData?.shippingCost ?? "");
  const [shippingMwst, setShippingMwst] = useState<number>(initialData?.shippingMwst ?? 19);
  const [paymentMethod, setPaymentMethod] = useState<"konto" | "bar">(initialData?.paymentMethod ?? "konto");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function handleReset() {
    setItems([newLine(1)]);
    setMwstRate(19);
    setShippingCost("");
    setShippingMwst(19);
    setPaymentMethod("konto");
    setError("");
    formRef.current?.reset();
  }

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

  const bruttoPositionen = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const shippingVal = shippingCost !== "" ? parseFloat(shippingCost) || 0 : 0;
  const bruttoGesamt = bruttoPositionen + shippingVal;
  const productNetto = mwstRate > 0 ? bruttoPositionen / (1 + mwstRate / 100) : bruttoPositionen;
  const productMwstAmt = bruttoPositionen - productNetto;
  const shippingNetto = shippingVal > 0 && shippingMwst > 0 ? shippingVal / (1 + shippingMwst / 100) : shippingVal;
  const shippingMwstAmt = shippingVal - shippingNetto;
  const netto = productNetto + shippingNetto;
  const mwstAmt = productMwstAmt + shippingMwstAmt;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = String(fd.get("date") ?? today);
    const customerName = String(fd.get("customerName") ?? "").trim();
    const customerAddress = String(fd.get("customerAddress") ?? "").trim();
    const customerNum = String(fd.get("customerNum") ?? "").trim();
    const notes = String(fd.get("notes") ?? "").trim();
    const noPayment = docType === "angebot" || docType === "gutschrift";
    const paymentInfo = paymentMethod === "konto" ? String(fd.get("paymentInfo") ?? "").trim() : null;

    if (!customerName) { setError("Kundenname fehlt"); return; }
    if (items.some((it) => !it.description)) { setError("Alle Positionen brauchen eine Bezeichnung"); return; }

    setError("");
    const payload = {
      date, customerName, customerAddress, customerNum, mwstRate,
      shippingCost: shippingCost !== "" ? shippingVal : null,
      shippingMwst,
      paymentMethod: noPayment ? "konto" : paymentMethod,
      notes,
      paymentInfo: noPayment ? null : (paymentInfo || null),
      docType,
      originalInvoiceId: originalInvoiceId ?? undefined,
      originalInvoiceNum: originalInvoiceNum ?? undefined,
      items: items.map((it) => ({
        pos: it.pos,
        quantity: it.quantity,
        description: it.description,
        unitPrice: it.unitPrice,
        skus: it.skus.filter((s) => s.sku).map((s) => ({ sku: s.sku, lager: s.lager })),
      })),
    };
    startTransition(() => {
      if (initialData?.invoiceId) {
        updateInvoice(initialData.invoiceId, payload);
      } else {
        createInvoice(payload);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Kundendaten */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Datum</label>
          <input name="date" type="date" defaultValue={initialData?.date ?? today}
            className="h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10" />
        </div>
        <div className="grid gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Kunden-Nr. (optional)</label>
          <input name="customerNum" type="text" defaultValue={initialData?.customerNum ?? ""} placeholder="z.B. 18043"
            className="h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10" />
        </div>
        <div className="flex items-end gap-4">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">MwSt.</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="mwst" value="19" checked={mwstRate === 19} onChange={() => setMwstRate(19)} className="accent-brand-red" />
            <span className="text-sm font-semibold">19 %</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="mwst" value="20" checked={mwstRate === 20} onChange={() => setMwstRate(20)} className="accent-brand-red" />
            <span className="text-sm font-semibold">20 %</span>
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
          <input name="customerName" type="text" defaultValue={initialData?.customerName ?? ""} placeholder="Max Mustermann" required
            className="h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10" />
        </div>
        <div className="grid gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Adresse</label>
          <textarea name="customerAddress" rows={2} defaultValue={initialData?.customerAddress ?? ""} placeholder={"Musterstraße 1\n12345 Musterstadt"}
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
                        <div className="ml-1 mt-1 flex gap-4 font-mono text-xs">
                          <span className="text-grey-dark">Neuware-Lager: <strong className="text-brand-red">{found.stock}</strong></span>
                          <span className="text-grey-dark">NS-Lager: <strong className="text-brand-red">{found.stockNS}</strong></span>
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

      {/* Versandkosten + Summen */}
      <div className="flex flex-col items-end gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="font-mono text-xs font-semibold text-grey-dark">Versand / Transport (optional)</label>
          <div className="relative">
            <input
              type="number"
              min={0}
              step={0.01}
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              placeholder="0,00"
              className="h-9 w-32 rounded-lg border border-grey-border bg-white px-3 pr-8 font-mono text-sm text-right tabular-nums text-grey-dark focus:border-brand-red focus:outline-none"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-grey-mid">€</span>
          </div>
          {shippingVal > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-grey-mid">MwSt.:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={shippingMwst === 19} onChange={() => setShippingMwst(19)} className="accent-brand-red" />
                <span className="font-mono text-sm">19 %</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={shippingMwst === 0} onChange={() => setShippingMwst(0)} className="accent-brand-red" />
                <span className="font-mono text-sm">0 %</span>
              </label>
            </div>
          )}
        </div>
        <div className="w-80 space-y-1.5 rounded-lg border border-grey-border bg-grey-light p-4">
          <div className="flex justify-between font-mono text-sm text-grey-mid">
            <span>Netto Produkte ({mwstRate} %)</span>
            <span className="tabular-nums">{productNetto.toFixed(2)} €</span>
          </div>
          {mwstRate > 0 && (
            <div className="flex justify-between font-mono text-sm text-grey-mid">
              <span>zzgl. MwSt ({mwstRate} %)</span>
              <span className="tabular-nums">{productMwstAmt.toFixed(2)} €</span>
            </div>
          )}
          {shippingVal > 0 && shippingMwst !== mwstRate && (
            <>
              <div className="flex justify-between font-mono text-sm text-grey-mid">
                <span>Netto Versand ({shippingMwst} %)</span>
                <span className="tabular-nums">{shippingNetto.toFixed(2)} €</span>
              </div>
              {shippingMwst > 0 && (
                <div className="flex justify-between font-mono text-sm text-grey-mid">
                  <span>zzgl. MwSt ({shippingMwst} %)</span>
                  <span className="tabular-nums">{shippingMwstAmt.toFixed(2)} €</span>
                </div>
              )}
            </>
          )}
          {shippingVal > 0 && shippingMwst === mwstRate && (
            <div className="flex justify-between font-mono text-sm text-grey-mid">
              <span>Versand (brutto)</span>
              <span className="tabular-nums">{shippingVal.toFixed(2)} €</span>
            </div>
          )}
          <div className="flex justify-between border-t border-grey-border pt-2 font-mono text-sm font-bold text-grey-dark">
            <span>{docType === "angebot" ? "Angebotsbetrag" : docType === "gutschrift" ? "Gutschriftsbetrag" : "Rechnungsbetrag"}</span>
            <span className="tabular-nums">{bruttoGesamt.toFixed(2)} €</span>
          </div>
          {mwstRate > 0 && (
            <p className="font-mono text-[10px] text-grey-mid pt-1">* Eingegebene Preise sind Bruttopreise inkl. MwSt.</p>
          )}
        </div>
      </div>

      {/* Notiz + Bezahlart */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
            Notiz (erscheint auf {docType === "angebot" ? "Angebot" : docType === "gutschrift" ? "Gutschrift" : "Rechnung"})
          </label>
          <textarea name="notes" rows={2} defaultValue={initialData?.notes ?? ""} placeholder="z.B. Gültig bis 31.07.2026, Lieferbedingungen ..."
            className="rounded-lg border border-grey-border bg-white px-3 py-2 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10 resize-none" />
        </div>
        {docType !== "angebot" && docType !== "gutschrift" && (
          <div className="grid gap-3">
            <div>
              <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Bezahlart</div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={paymentMethod === "konto"} onChange={() => setPaymentMethod("konto")} className="accent-brand-red" />
                  <span className="text-sm font-semibold">Banküberweisung</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={paymentMethod === "bar"} onChange={() => setPaymentMethod("bar")} className="accent-brand-red" />
                  <span className="text-sm font-semibold">Bar</span>
                </label>
              </div>
            </div>
            {paymentMethod === "konto" && (
              <div className="grid gap-1.5">
                <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Zahlungsinformation</label>
                <textarea name="paymentInfo" rows={2} defaultValue={initialData?.paymentInfo ?? ""}
                  placeholder="z.B. Zahlung (eBay Managed Payments) vom 07.06.2026 529,00 €"
                  className="rounded-lg border border-grey-border bg-white px-3 py-2 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10 resize-none" />
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-brand-red/20 bg-brand-red/5 px-4 py-3 font-mono text-sm text-brand-red">{error}</div>
      )}

      <div className="flex justify-between items-center">
        {!initialData ? (
          <button type="button" onClick={handleReset}
            className="rounded-lg border border-grey-border bg-white px-5 py-2.5 font-mono text-sm font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors">
            Zurücksetzen
          </button>
        ) : <div />}
        <button type="submit" disabled={isPending}
          className="rounded-lg bg-brand-red px-6 py-2.5 font-mono text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-50 transition-colors">
          {isPending ? "Wird gespeichert…" : initialData?.invoiceId
            ? (docType === "angebot" ? "Angebot speichern" : "Korrektur speichern")
            : (docType === "angebot" ? "Angebot erstellen" : docType === "gutschrift" ? "Gutschrift erstellen" : "Rechnung erstellen")}
        </button>
      </div>
    </form>
  );
}
