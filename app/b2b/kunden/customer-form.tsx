"use client";

import { useState, useTransition } from "react";
import { createCustomer, deleteCustomer } from "./actions";

type Customer = {
  id: string;
  name: string;
  customerNum: string | null;
  phone: string | null;
  address: string;
  mwstRate: number;
  paymentMethod: string;
  paymentInfo: string | null;
  notes: string | null;
  createdAt: Date;
};

const inputClass =
  "h-9 w-full rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10";
const labelClass =
  "mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid";
const radioClass = "flex items-center gap-2 cursor-pointer";

function NewCustomerForm({ onDone }: { onDone: () => void }) {
  const [paymentMethod, setPaymentMethod] = useState<"konto" | "bar">("konto");
  const [mwstRate, setMwstRate] = useState(19);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const address = (fd.get("address") as string).trim();
    if (!name) return setError("Name ist erforderlich.");
    if (!address) return setError("Adresse ist erforderlich.");

    startTransition(async () => {
      const result = await createCustomer({
        name,
        customerNum: (fd.get("customerNum") as string).trim() || undefined,
        phone: (fd.get("phone") as string).trim() || undefined,
        address,
        mwstRate,
        paymentMethod,
        paymentInfo: paymentMethod === "konto" ? (fd.get("paymentInfo") as string).trim() || undefined : undefined,
        notes: (fd.get("notes") as string).trim() || undefined,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Firmenname / Name *</label>
          <input name="name" type="text" required placeholder="Firma GmbH" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Kundennummer (optional)</label>
          <input name="customerNum" type="text" placeholder="leer = automatisch" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Telefon (optional)</label>
          <input name="phone" type="tel" placeholder="+49 123 456789" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Adresse *</label>
        <textarea
          name="address"
          required
          rows={3}
          placeholder={"Musterstraße 1\n12345 Musterstadt"}
          className="w-full rounded-lg border border-grey-border bg-white px-3 py-2 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10 resize-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>MwSt.</label>
          <div className="flex gap-5 pt-1">
            {([19, 20, 0] as const).map((rate) => (
              <label key={rate} className={radioClass}>
                <input type="radio" checked={mwstRate === rate} onChange={() => setMwstRate(rate)} className="accent-brand-red" />
                <span className="font-mono text-sm font-semibold">{rate === 0 ? "0 % (steuerfrei)" : `${rate} %`}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>Zahlungsart</label>
          <div className="flex gap-5 pt-1">
            <label className={radioClass}>
              <input type="radio" checked={paymentMethod === "konto"} onChange={() => setPaymentMethod("konto")} className="accent-brand-red" />
              <span className="font-mono text-sm font-semibold">Überweisung</span>
            </label>
            <label className={radioClass}>
              <input type="radio" checked={paymentMethod === "bar"} onChange={() => setPaymentMethod("bar")} className="accent-brand-red" />
              <span className="font-mono text-sm font-semibold">Bar</span>
            </label>
          </div>
        </div>
      </div>

      {paymentMethod === "konto" && (
        <div>
          <label className={labelClass}>Bankverbindung / Zahlungsinfo (optional)</label>
          <input name="paymentInfo" type="text" placeholder="z.B. IBAN DE12 3456 7890 …" className={inputClass} />
        </div>
      )}

      <div>
        <label className={labelClass}>Notiz (optional)</label>
        <input name="notes" type="text" placeholder="Interne Notiz…" className={inputClass} />
      </div>

      {error && <p className="font-mono text-xs text-brand-red">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-brand-red px-5 py-2.5 font-semibold text-sm text-white hover:bg-brand-red/90">
          Kunde anlegen
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-grey-border px-5 py-2.5 font-semibold text-sm text-grey-dark hover:border-brand-red hover:text-brand-red">
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function CustomerCard({ customer }: { customer: Customer }) {
  const [, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Kunde "${customer.name}" wirklich löschen?`)) return;
    startTransition(async () => {
      await deleteCustomer(customer.id);
    });
  }

  return (
    <div className="flex items-start gap-4 rounded-xl border border-grey-border bg-white p-4">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-grey-dark text-sm">{customer.name}</span>
          {customer.customerNum && (
            <span className="rounded bg-grey-light px-1.5 py-0.5 font-mono text-[10px] text-grey-mid">{customer.customerNum}</span>
          )}
          <span className="rounded bg-grey-light px-1.5 py-0.5 font-mono text-[10px] text-grey-mid">
            MwSt. {customer.mwstRate === 0 ? "0 % (steuerfrei)" : `${customer.mwstRate} %`}
          </span>
        </div>
        <div className="font-mono text-xs text-grey-mid whitespace-pre-line">{customer.address}</div>
        <div className="flex flex-wrap gap-3 pt-1 font-mono text-[10px] text-grey-mid">
          <span>{customer.paymentMethod === "konto" ? "Überweisung" : "Bar"}{customer.paymentInfo ? ` · ${customer.paymentInfo}` : ""}</span>
          {customer.phone && <span>{customer.phone}</span>}
          {customer.notes && <span>📝 {customer.notes}</span>}
        </div>
      </div>
      <button
        onClick={handleDelete}
        className="flex-shrink-0 rounded-lg border border-grey-border px-3 py-1.5 font-mono text-xs font-semibold text-grey-mid hover:border-brand-red hover:text-brand-red transition-colors"
      >
        Löschen
      </button>
    </div>
  );
}

export function CustomerManager({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-grey-mid">
          {initialCustomers.length === 0
            ? "Noch keine Kunden angelegt."
            : `${initialCustomers.length} Kunde${initialCustomers.length !== 1 ? "n" : ""}`}
        </p>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="rounded-lg bg-brand-red px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-brand-red/90">
            + Neuer Kunde
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-grey-border bg-white p-5">
          <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-grey-mid">Neuen B2B-Kunden anlegen</h2>
          <NewCustomerForm onDone={() => setShowForm(false)} />
        </div>
      )}

      <div className="space-y-3">
        {initialCustomers.map((c) => (
          <CustomerCard key={c.id} customer={c} />
        ))}
      </div>
    </div>
  );
}
