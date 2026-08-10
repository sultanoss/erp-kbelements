"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createInvoice, updateInvoice, getLastPriceForCustomerSku } from "@/app/actions";

type DocType = "rechnung" | "angebot" | "gutschrift" | "proforma";

type SkuEntry = { id: number; sku: string; lager: string };
type LineItem = { id: number; pos: number; quantity: number; description: string; unitPrice: number; skus: SkuEntry[] };
type SkuData = { sku: string; name: string; stock: number; stockNS: number; purchasePrice: number | null };

export type B2bCustomer = {
  id: string;
  name: string;
  customerNum: string | null;
  phone: string | null;
  address: string;
  mwstRate: number;
  paymentMethod: string;
  paymentInfo: string | null;
  notes: string | null;
};

export type B2cCustomer = {
  id: string;
  name: string;
  customerNum: string | null;
  phone: string | null;
  address: string;
};

export type InvoiceInitialData = {
  invoiceId?: string;
  date: string;
  customerName: string;
  customerAddress: string;
  customerNum: string;
  customerPhone: string;
  bezahlt?: boolean;
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
  return { id: nextId++, pos, quantity: 0, description: "", unitPrice: 0, skus: [{ id: nextSkuId++, sku: "", lager: "neuware" }] };
}

export function InvoiceForm({
  skus,
  initialData,
  docType = "rechnung",
  originalInvoiceId,
  originalInvoiceNum,
  b2bCustomers = [],
  b2cCustomers = [],
  defaultCustomerNum,
  isAdmin = false,
}: {
  skus: SkuData[];
  initialData?: InvoiceInitialData;
  docType?: DocType;
  originalInvoiceId?: string;
  originalInvoiceNum?: string;
  b2bCustomers?: B2bCustomer[];
  b2cCustomers?: B2cCustomer[];
  defaultCustomerNum?: string;
  isAdmin?: boolean;
}) {
  const [items, setItems] = useState<LineItem[]>(initialData?.items ?? [newLine(1)]);
  const [mwstRate, setMwstRate] = useState(initialData?.mwstRate ?? 19);
  const [shippingCost, setShippingCost] = useState<string>(initialData?.shippingCost ?? "");
  const [shippingMwst, setShippingMwst] = useState<number>(initialData?.shippingMwst ?? 19);
  const [paymentMethod, setPaymentMethod] = useState<"konto" | "bar">(initialData?.paymentMethod ?? "konto");
  const [zahlungAusstehend, setZahlungAusstehend] = useState(initialData?.bezahlt === false || (!initialData && docType === "proforma"));
  const [kundeSpeichernB2c, setKundeSpeichernB2c] = useState(false);
  const [kundeSpeichernB2b, setKundeSpeichernB2b] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Controlled customer fields for B2B auto-fill
  const [customerName, setCustomerName] = useState(initialData?.customerName ?? "");
  const [customerAddress, setCustomerAddress] = useState(initialData?.customerAddress ?? "");
  const [customerNum, setCustomerNum] = useState(initialData?.customerNum ?? defaultCustomerNum ?? "");
  const [customerPhone, setCustomerPhone] = useState(initialData?.customerPhone ?? "");
  const [paymentInfo, setPaymentInfo] = useState(initialData?.paymentInfo ?? "");
  const [selectedB2bId, setSelectedB2bId] = useState("");
  const [selectedB2cId, setSelectedB2cId] = useState("");
  const [lastPrices, setLastPrices] = useState<Record<number, { sku: string; price: number | null } | undefined>>({});

  useEffect(() => {
    setLastPrices({});
    if (!selectedB2bId) return;
    const customer = b2bCustomers.find((c) => c.id === selectedB2bId);
    if (!customer) return;
    for (const item of items) {
      const sku = item.skus[0]?.sku;
      if (sku) {
        getLastPriceForCustomerSku(customer.name, sku).then((price) =>
          setLastPrices((prev) => ({ ...prev, [item.id]: { sku, price } }))
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedB2bId]);

  function selectB2bCustomer(id: string) {
    setSelectedB2bId(id);
    if (!id) return;
    const c = b2bCustomers.find((x) => x.id === id);
    if (!c) return;
    setCustomerName(c.name);
    setCustomerAddress(c.address);
    setCustomerNum(c.customerNum ?? "");
    setCustomerPhone(c.phone ?? "");
    setMwstRate(c.mwstRate);
    setPaymentMethod(c.paymentMethod as "konto" | "bar");
    setPaymentInfo(c.paymentInfo ?? "");
  }

  function selectB2cCustomer(id: string) {
    setSelectedB2cId(id);
    if (!id) { setCustomerNum(""); setCustomerPhone(""); return; }
    const c = b2cCustomers.find((x) => x.id === id);
    if (!c) return;
    setCustomerName(c.name);
    setCustomerAddress(c.address);
    setCustomerNum(c.customerNum ?? "");
    setCustomerPhone(c.phone ?? "");
  }

  function handleReset() {
    setItems([newLine(1)]);
    setMwstRate(19);
    setShippingCost("");
    setShippingMwst(19);
    setPaymentMethod("konto");
    setZahlungAusstehend(false);
    setKundeSpeichernB2c(false);
    setKundeSpeichernB2b(false);
    setError("");
    setCustomerName("");
    setCustomerAddress("");
    setCustomerNum("");
    setPaymentInfo("");
    setSelectedB2bId("");
    setSelectedB2cId("");
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
    // Determine synchronously before setItems (updater runs asynchronously)
    const currentItem = items.find((it) => it.id === itemId);
    const isFirstSku = currentItem ? currentItem.skus.findIndex((s) => s.id === skuId) === 0 : false;

    setItems((prev) => prev.map((it) => {
      if (it.id !== itemId) return it;
      const idx = it.skus.findIndex((s) => s.id === skuId);
      const updatedSkus = it.skus.map((s) => s.id === skuId ? { ...s, [field]: value } : s);
      if (field === "sku" && idx === 0 && value && !it.description && it.skus.length === 1) {
        const found = skus.find((s) => s.sku === value);
        if (found?.name) return { ...it, skus: updatedSkus, description: found.name };
      }
      return { ...it, skus: updatedSkus };
    }));

    if (field === "sku" && isFirstSku && selectedB2bId) {
      const customer = b2bCustomers.find((c) => c.id === selectedB2bId);
      if (customer) {
        if (!value) {
          setLastPrices((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
        } else {
          getLastPriceForCustomerSku(customer.name, value).then((price) =>
            setLastPrices((prev) => ({ ...prev, [itemId]: { sku: value, price } }))
          );
        }
      }
    }
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
    const notes = String(fd.get("notes") ?? "").trim();
    const noPayment = docType === "angebot" || docType === "gutschrift";

    if (!customerName.trim()) { setError("Kundenname fehlt"); return; }
    if (items.some((it) => !it.description)) { setError("Alle Positionen brauchen eine Bezeichnung"); return; }
    if (items.some((it) => it.quantity === 0 || it.unitPrice === 0)) {
      if (!window.confirm("Eine oder mehrere Positionen haben Menge oder Preis = 0. Trotzdem fortfahren?")) return;
    }

    setError("");
    const payload = {
      date,
      customerName: customerName.trim(),
      customerAddress: customerAddress.trim(),
      customerNum: customerNum.trim(),
      customerPhone: customerPhone.trim() || null,
      mwstRate,
      shippingCost: shippingCost !== "" ? shippingVal : null,
      shippingMwst,
      paymentMethod: noPayment ? "konto" : paymentMethod,
      notes,
      paymentInfo: noPayment ? null : (paymentMethod === "konto" ? paymentInfo.trim() || null : null),
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
        updateInvoice(initialData.invoiceId, { ...payload, bezahlt: !zahlungAusstehend, saveAsB2cCustomer: kundeSpeichernB2c, saveAsB2bCustomer: kundeSpeichernB2b });
      } else {
        createInvoice({ ...payload, bezahlt: !zahlungAusstehend, saveAsB2cCustomer: kundeSpeichernB2c, saveAsB2bCustomer: kundeSpeichernB2b });
      }
    });
  }

  const fieldClass = "h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">

      {/* B2C Kunde Auswahl */}
      {b2cCustomers.length > 0 && !initialData?.invoiceId && (
        <div className="flex items-center gap-3 rounded-lg border border-grey-border bg-grey-light/60 px-4 py-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid whitespace-nowrap">B2C Kunde</span>
          <select
            value={selectedB2cId}
            onChange={(e) => selectB2cCustomer(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
          >
            <option value="">— Kunden wählen (optional) —</option>
            {b2cCustomers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.customerNum ? ` (${c.customerNum})` : ""}</option>
            ))}
          </select>
          {selectedB2cId && (
            <button type="button" onClick={() => { setSelectedB2cId(""); }} className="font-mono text-xs text-grey-mid hover:text-brand-red">
              ✕ zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* B2B Kunde Auswahl */}
      {b2bCustomers.length > 0 && !initialData?.invoiceId && (
        <div className="flex items-center gap-3 rounded-lg border border-grey-border bg-grey-light/60 px-4 py-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid whitespace-nowrap">B2B Kunde</span>
          <select
            value={selectedB2bId}
            onChange={(e) => selectB2bCustomer(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
          >
            <option value="">— Kunden wählen (optional) —</option>
            {b2bCustomers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.customerNum ? ` (${c.customerNum})` : ""}
              </option>
            ))}
          </select>
          {selectedB2bId && (
            <button
              type="button"
              onClick={() => { setSelectedB2bId(""); }}
              className="font-mono text-xs text-grey-mid hover:text-brand-red"
            >
              ✕ zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Datum + Kundennummer + Telefon + MwSt */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="grid gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Datum</label>
          <input name="date" type="date" defaultValue={initialData?.date ?? today} className={fieldClass} />
        </div>
        <div className="grid gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Kunden-Nr. (optional)</label>
          <input
            type="text"
            value={customerNum}
            onChange={(e) => setCustomerNum(e.target.value)}
            placeholder="z.B. KN-26-01"
            className={fieldClass}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Telefon (optional)</label>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="+49 123 456789"
            className={fieldClass}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">MwSt.</span>
          {([17, 19, 20, 21, 22, 23, 25, 0] as const).map((rate) => (
            <label key={rate} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="mwst" value={rate} checked={mwstRate === rate} onChange={() => setMwstRate(rate)} className="accent-brand-red" />
              <span className="text-sm font-semibold">{rate === 0 ? "0 %" : `${rate} %`}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Kundenname + Adresse */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Kundenname *</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Max Mustermann"
            required
            className={fieldClass}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Adresse</label>
          <textarea
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            rows={2}
            placeholder={"Musterstraße 1\n12345 Musterstadt"}
            className="rounded-lg border border-grey-border bg-white px-3 py-2 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10 resize-none"
          />
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
              <span className="pt-2 font-mono text-sm text-grey-mid text-center">{it.pos}.</span>

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
                      {found && (() => {
                        const remNeuware = found.stock - (s.lager === "neuware" ? it.quantity : 0);
                        const remNS = found.stockNS - (s.lager === "ns" ? it.quantity : 0);
                        return (
                          <div className="ml-1 mt-1 flex gap-4 font-mono text-xs">
                            <span className="text-grey-dark">Neuware-Lager: <strong className={remNeuware < 0 ? "text-orange-500" : "text-brand-red"}>{remNeuware}</strong></span>
                            <span className="text-grey-dark">NS-Lager: <strong className={remNS < 0 ? "text-orange-500" : "text-brand-red"}>{remNS}</strong></span>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
                <button type="button" onClick={() => addSku(it.id)}
                  className="mt-1 inline-flex items-center gap-1 rounded border border-grey-border bg-grey-light px-2 py-0.5 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors">
                  + weitere Art.-Nr.
                </button>
              </div>

              <input
                value={it.description}
                onChange={(e) => updateItem(it.id, "description", e.target.value)}
                placeholder="Bezeichnung *"
                required
                className="h-8 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none"
              />
              <div className="flex flex-col gap-0.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={it.quantity === 0 ? "" : String(it.quantity)}
                  onChange={(e) => updateItem(it.id, "quantity", parseFloat(e.target.value.replace(",", ".")) || 0)}
                  className="h-8 rounded-lg border border-grey-border bg-white px-2 font-mono text-sm text-right tabular-nums text-grey-dark focus:border-brand-red focus:outline-none"
                />
                {isAdmin && (() => {
                  const firstSku = it.skus[0]?.sku;
                  const foundSku = firstSku ? skus.find((s) => s.sku === firstSku) : null;
                  return foundSku?.purchasePrice != null ? (
                    <span className="pr-1 font-mono text-[10px] font-bold text-grey-dark text-right">Ø-EK: {foundSku.purchasePrice.toFixed(2)} €</span>
                  ) : null;
                })()}
              </div>
              <div className="flex flex-col gap-0.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={it.unitPrice === 0 ? "" : String(it.unitPrice)}
                  onChange={(e) => updateItem(it.id, "unitPrice", parseFloat(e.target.value.replace(",", ".")) || 0)}
                  className="h-8 rounded-lg border border-grey-border bg-white px-2 font-mono text-sm text-right tabular-nums text-grey-dark focus:border-brand-red focus:outline-none"
                />
                {selectedB2bId && lastPrices[it.id] !== undefined && (
                  <span className="pl-1 font-mono text-[10px] text-brand-red">
                    {lastPrices[it.id]!.price != null
                      ? `Letzter Preis: ${lastPrices[it.id]!.price!.toFixed(2)} €`
                      : "Noch kein B2B-Kauf"}
                  </span>
                )}
              </div>
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
              {([17, 19, 20, 21, 22, 23, 25, 0] as const).map((rate) => (
                <label key={rate} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" checked={shippingMwst === rate} onChange={() => setShippingMwst(rate)} className="accent-brand-red" />
                  <span className="font-mono text-sm">{rate} %</span>
                </label>
              ))}
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
            <span>{docType === "angebot" ? "Angebotsbetrag" : docType === "gutschrift" ? "Gutschriftsbetrag" : docType === "proforma" ? "Proformabetrag" : "Rechnungsbetrag"}</span>
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
            Notiz (erscheint auf {docType === "angebot" ? "Angebot" : docType === "gutschrift" ? "Gutschrift" : docType === "proforma" ? "Proforma-Rechnung" : "Rechnung"})
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
                <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Zahlungsinformation (optional)</label>
                <textarea
                  value={paymentInfo}
                  onChange={(e) => setPaymentInfo(e.target.value)}
                  rows={2}
                  placeholder="z.B. Zahlung (eBay Managed Payments) vom 07.06.2026 529,00 €"
                  className="rounded-lg border border-grey-border bg-white px-3 py-2 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10 resize-none"
                />
              </div>
            )}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={zahlungAusstehend}
                onChange={(e) => setZahlungAusstehend(e.target.checked)}
                className="h-4 w-4 rounded accent-brand-red"
              />
              <span className="text-sm font-semibold text-grey-dark">Zahlung ausstehend (unbezahlt)</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={kundeSpeichernB2c}
                onChange={(e) => setKundeSpeichernB2c(e.target.checked)}
                className="h-4 w-4 rounded accent-brand-red"
              />
              <span className="text-sm font-semibold text-grey-dark">Kunde speichern (B2C)</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={kundeSpeichernB2b}
                onChange={(e) => setKundeSpeichernB2b(e.target.checked)}
                className="h-4 w-4 rounded accent-brand-red"
              />
              <span className="text-sm font-semibold text-grey-dark">Kunde speichern (B2B)</span>
            </label>
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
            : (docType === "angebot" ? "Angebot erstellen" : docType === "gutschrift" ? "Gutschrift erstellen" : docType === "proforma" ? "Proforma erstellen" : "Rechnung erstellen")}
        </button>
      </div>
    </form>
  );
}
