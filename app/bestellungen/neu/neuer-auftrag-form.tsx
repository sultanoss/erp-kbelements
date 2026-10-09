"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createManualOrder } from "./actions";

type ItemInfo = { sku: string; name: string };

type LineItem = { id: number; sku: string; quantity: number; price: number };

const labelClass = "mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid";
const inputClass =
  "h-9 w-full rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10";

function SkuCombobox({
  value,
  allItems,
  onChange,
}: {
  value: string;
  allItems: ItemInfo[];
  onChange: (sku: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = q.trim()
    ? allItems.filter(
        (i) =>
          i.sku.toLowerCase().includes(q.toLowerCase()) ||
          i.name.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 20)
    : allItems.slice(0, 20);

  const selectedItem = allItems.find((i) => i.sku === value);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQ("");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(true); setQ(""); setTimeout(() => inputRef.current?.focus(), 0); }}
        className={`${inputClass} flex items-center justify-between gap-2 text-left`}
      >
        <span className={value ? "text-grey-dark" : "text-grey-mid/60"}>
          {selectedItem ? `${selectedItem.sku} — ${selectedItem.name}` : "— SKU wählen —"}
        </span>
        <svg className="w-4 h-4 text-grey-mid flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-[300px] rounded-lg border border-grey-border bg-white shadow-xl">
          <div className="border-b border-grey-border p-2">
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setOpen(false); setQ(""); }
                if (e.key === "Enter" && filtered.length === 1) { onChange(filtered[0].sku); setOpen(false); setQ(""); }
              }}
              placeholder="SKU oder Name suchen…"
              className="h-8 w-full rounded-md border border-grey-border bg-grey-light/50 px-3 font-mono text-xs text-grey-dark placeholder:text-grey-mid/50 focus:outline-none focus:border-brand-red"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 font-mono text-xs text-grey-mid">Kein Artikel gefunden</div>
            ) : (
              filtered.map((i) => (
                <button
                  key={i.sku}
                  type="button"
                  onClick={() => { onChange(i.sku); setOpen(false); setQ(""); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-grey-light/60 transition-colors ${value === i.sku ? "bg-brand-red/5" : ""}`}
                >
                  <span className="font-mono text-xs font-semibold text-grey-dark whitespace-nowrap">{i.sku}</span>
                  <span className="font-mono text-[11px] text-grey-mid truncate">{i.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function NeuerAuftragForm({ allItems }: { allItems: ItemInfo[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("DE");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [lines, setLines] = useState<LineItem[]>([]);
  const [nextId, setNextId] = useState(1);

  function addLine() {
    setLines((prev) => [...prev, { id: nextId, sku: "", quantity: 0, price: 0 }]);
    setNextId((n) => n + 1);
  }

  function removeLine(id: number) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLine(id: number, field: keyof LineItem, value: string | number) {
    setLines((prev) => prev.map((l) => l.id !== id ? l : { ...l, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validLines = lines.filter((l) => l.sku && l.quantity > 0);
    if (validLines.length === 0) return setError("Mindestens ein Artikel mit Menge > 0 erforderlich.");
    if (validLines.some((l) => l.price <= 0)) return setError("Preis muss größer als 0 sein.");

    startTransition(async () => {
      const result = await createManualOrder({
        customerName,
        street,
        zip,
        city,
        country,
        phoneNumber,
        items: validLines.map((l) => ({ sku: l.sku, quantity: l.quantity, price: l.price })),
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        router.push(`/bestellungen/${result.orderId}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Kundendaten */}
      <div className="rounded-xl border border-grey-border bg-white p-5 space-y-4">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-grey-mid">Kundendaten</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Kundenname *</label>
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required placeholder="Vor- und Nachname" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Telefon *</label>
            <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required placeholder="+49 170 1234567" className={inputClass} />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className={labelClass}>Straße + Hausnummer *</label>
            <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} required placeholder="Musterstraße 1" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Land</label>
            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="DE" className={inputClass} />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>PLZ *</label>
            <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} required placeholder="12345" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ort *</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required placeholder="Berlin" className={inputClass} />
          </div>
        </div>
      </div>

      {/* Artikel */}
      <div className="rounded-xl border border-grey-border bg-white p-5 space-y-4">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-grey-mid">Artikel</h2>

        {lines.length > 0 && (
          <div className="space-y-2">
            <div className="hidden grid-cols-[1fr_6rem_8rem_2rem] gap-2 md:grid">
              {["SKU / Artikel", "Menge", "Preis (€)", ""].map((h, i) => (
                <div key={i} className={labelClass}>{h}</div>
              ))}
            </div>
            {lines.map((line) => (
              <div key={line.id} className="grid grid-cols-1 gap-2 rounded-lg border border-grey-border bg-white p-3 md:grid-cols-[1fr_6rem_8rem_2rem] md:items-center md:rounded-none md:border-0 md:bg-transparent md:p-0">
                <SkuCombobox
                  value={line.sku}
                  allItems={allItems}
                  onChange={(sku) => updateLine(line.id, "sku", sku)}
                />
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={line.quantity === 0 ? "" : line.quantity}
                  onChange={(e) => updateLine(line.id, "quantity", parseInt(e.target.value) || 0)}
                  placeholder="Menge"
                  className={inputClass}
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.price === 0 ? "" : line.price}
                  onChange={(e) => updateLine(line.id, "price", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-grey-border text-grey-mid hover:border-brand-red hover:text-brand-red"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addLine}
          className="rounded-lg border border-grey-border px-4 py-2 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red"
        >
          + Artikel hinzufügen
        </button>
      </div>

      <div className="flex items-center justify-end gap-4">
        {error && <span className="font-mono text-xs text-brand-red">{error}</span>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand-red px-6 py-2.5 font-semibold text-white hover:bg-brand-red/90 disabled:opacity-50"
        >
          {isPending ? "Wird erstellt…" : "Auftrag erstellen"}
        </button>
      </div>
    </form>
  );
}
