"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Sku {
  sku: string;
  name: string | null;
}

interface SelectedItem {
  sku: string;
  quantity: number;
  isManual: boolean;
}

interface Props {
  skus: Sku[];
  userName: string;
}

export default function NewReturnForm({ skus, userName }: Props) {
  const [orderNumber, setOrderNumber] = useState("");
  const [description, setDescription] = useState("");
  const [initialStatus, setInitialStatus] = useState("eingegangen");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [skuSearch, setSkuSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [manualSku, setManualSku] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const filteredSkus = skus.filter(
    (s) =>
      !selectedItems.some((i) => i.sku === s.sku) &&
      (s.sku.toLowerCase().includes(skuSearch.toLowerCase()) ||
        (s.name ?? "").toLowerCase().includes(skuSearch.toLowerCase()))
  );

  function addSku(sku: string, isManual = false) {
    if (selectedItems.some((i) => i.sku === sku)) return;
    setSelectedItems((prev) => [...prev, { sku, quantity: 1, isManual }]);
    setSkuSearch("");
    setManualSku("");
    setShowDropdown(false);
  }

  function removeItem(sku: string) {
    setSelectedItems((prev) => prev.filter((i) => i.sku !== sku));
  }

  function updateQuantity(sku: string, qty: number) {
    setSelectedItems((prev) =>
      prev.map((i) => (i.sku === sku ? { ...i, quantity: Math.max(1, qty) } : i))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedItems.length === 0) {
      setError("Bitte mindestens eine SKU auswählen.");
      return;
    }
    setError("");
    setSubmitting(true);

    const { data: ret, error: retErr } = await supabase
      .from("returns")
      .insert({
        received_by: userName,
        order_number: orderNumber || null,
        description: description || null,
        status: initialStatus,
      })
      .select("id")
      .single();

    if (retErr || !ret) {
      setError(retErr?.message ?? "Fehler beim Speichern");
      setSubmitting(false);
      return;
    }

    const itemsPayload = selectedItems.map((i) => ({
      return_id: ret.id,
      sku: i.sku,
      quantity: i.quantity,
      is_manual: i.isManual,
    }));

    const { error: itemErr } = await supabase.from("return_items").insert(itemsPayload);

    if (itemErr) {
      setError(itemErr.message);
      setSubmitting(false);
      return;
    }

    const statusNotes: Record<string, string> = {
      eingegangen: "Retoure eingegangen",
      nicht_zustellbar: "Status: Nicht zustellbar",
      klaeren_mit_kunde: "Status: Klären mit Kunde",
    };

    await supabase.from("return_events").insert({
      return_id: ret.id,
      event_type: "eingegangen",
      note: description || statusNotes[initialStatus] || "Retoure erfasst",
      author: userName,
    });

    router.push(`/returns/${ret.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Erfasst von */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-red flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-semibold">{userName.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-stone-900">{userName}</div>
            <div className="text-xs text-stone-500">Erfasst von</div>
          </div>
        </div>
      </div>

      {/* Auftragsnummer */}
      <div className="card p-4">
        <label className="label" htmlFor="orderNumber">
          Auftragsnummer <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <input
          id="orderNumber"
          type="text"
          className="input"
          placeholder="z.B. KBR-2685 oder Otto-Bestellnummer"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
        />
      </div>

      {/* Status */}
      <div className="card p-4">
        <label className="label" htmlFor="initialStatus">Status beim Erfassen</label>
        <div className="flex gap-2 flex-wrap mt-1">
          {[
            { value: "eingegangen",      label: "Eingegangen",      cls: "border-blue-400 bg-blue-50 text-blue-700" },
            { value: "nicht_zustellbar", label: "Nicht zustellbar", cls: "border-orange-400 bg-orange-50 text-orange-700" },
            { value: "klaeren_mit_kunde",label: "Klären mit Kunde", cls: "border-sky-400 bg-sky-50 text-sky-700" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setInitialStatus(opt.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium border-2 transition-colors ${
                initialStatus === opt.value
                  ? opt.cls
                  : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* SKU-Auswahl */}
      <div className="card p-4">
        <label className="label">SKUs</label>

        {/* Suchfeld */}
        <div className="relative" ref={dropdownRef}>
          <input
            type="text"
            className="input"
            placeholder="SKU suchen und auswählen..."
            value={skuSearch}
            onChange={(e) => { setSkuSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          />

          {showDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
              {filteredSkus.length === 0 && skuSearch.length < 1 ? (
                <div className="px-4 py-3 text-sm text-stone-400">Tippen zum Suchen...</div>
              ) : filteredSkus.length === 0 ? (
                <div className="px-4 py-2 text-sm text-stone-400">Keine SKU gefunden</div>
              ) : (
                filteredSkus.slice(0, 20).map((s) => (
                  <button
                    key={s.sku}
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center justify-between gap-2"
                    onClick={() => addSku(s.sku)}
                  >
                    <span className="text-sm font-medium text-stone-800">{s.sku}</span>
                    {s.name && <span className="text-xs text-stone-400 truncate">{s.name}</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Manuelle SKU-Eingabe */}
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="Manuelle SKU eingeben (nicht in Liste)"
            value={manualSku}
            onChange={(e) => setManualSku(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (manualSku.trim()) addSku(manualSku.trim(), true);
              }
            }}
          />
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            onClick={() => { if (manualSku.trim()) addSku(manualSku.trim(), true); }}
            disabled={!manualSku.trim()}
          >
            Hinzufügen
          </button>
        </div>
        <p className="text-xs text-stone-400 mt-1">Manuelle SKUs werden nur für diese Retoure verwendet und nicht gespeichert.</p>

        {/* Ausgewählte SKUs */}
        {selectedItems.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">Ausgewählt ({selectedItems.length})</div>
            {selectedItems.map((item) => (
              <div
                key={item.sku}
                className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
              >
                <div className="flex-1">
                  <span className="text-sm font-medium text-stone-800">{item.sku}</span>
                  {item.isManual && (
                    <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">manuell</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-stone-500 whitespace-nowrap">Menge:</label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    className="w-16 input py-1 text-center"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.sku, parseInt(e.target.value) || 1)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.sku)}
                  className="text-stone-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Beschreibung */}
      <div className="card p-4">
        <label className="label" htmlFor="description">
          Beschreibung <span className="text-stone-400 font-normal">(freier Text)</span>
        </label>
        <textarea
          id="description"
          rows={4}
          className="input resize-none"
          placeholder="z.B. Garantie Retoure eingegangen – Artikel defekt..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-end">
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          Abbrechen
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Wird gespeichert..." : "Retoure erfassen"}
        </button>
      </div>
    </form>
  );
}
