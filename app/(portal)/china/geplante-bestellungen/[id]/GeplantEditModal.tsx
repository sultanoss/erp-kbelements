"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GeplantTyp } from "../utils";
import { buildOrderPi } from "../utils";

const TYP_OPTIONS: { value: GeplantTyp; label: string }[] = [
  { value: "ORDER", label: "Order" },
  { value: "LOADING", label: "Loading" },
  { value: "CHECKEN", label: "Checken" },
];

interface ArtikelRow { id: string; artikel: string; anzahl: string; isNew?: boolean; }

interface Props {
  bestellung: { id: string; fabrik: string | null; datum: string; typ: GeplantTyp; notiz: string | null; };
  initialArtikel: Array<{ id: string; artikel: string; anzahl: number }>;
}

function newRow(): ArtikelRow {
  return { id: "new_" + Math.random().toString(36).slice(2), artikel: "", anzahl: "", isNew: true };
}

export default function GeplantEditModal({ bestellung, initialArtikel }: Props) {
  const [open, setOpen] = useState(false);
  const [typ, setTyp] = useState<GeplantTyp>(bestellung.typ);
  const [fabrik, setFabrik] = useState(bestellung.fabrik ?? "");
  const [datum, setDatum] = useState(bestellung.datum);
  const [notiz, setNotiz] = useState(bestellung.notiz ?? "");
  const [artikel, setArtikel] = useState<ArtikelRow[]>(
    initialArtikel.length > 0
      ? initialArtikel.map((a) => ({ id: a.id, artikel: a.artikel, anzahl: String(a.anzahl) }))
      : [newRow()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  function addRow() { setArtikel((prev) => [...prev, newRow()]); }
  function removeRow(id: string) { setArtikel((prev) => prev.filter((r) => r.id !== id)); }
  function updateRow(id: string, field: "artikel" | "anzahl", value: string) {
    setArtikel((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }

  async function handleSave() {
    if (!datum) { setError("Datum ist erforderlich."); return; }
    setSaving(true);
    setError("");

    const { error: dbError } = await supabase
      .from("ware_in_china")
      .update({
        order_pi_nummer: buildOrderPi(datum, typ),
        fabrik: fabrik.trim() || null,
        notiz: notiz.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bestellung.id);

    if (dbError) { setError(dbError.message); setSaving(false); return; }

    await supabase.from("ware_in_china_artikel").delete().eq("ware_id", bestellung.id);

    const validArtikel = artikel.filter((a) => a.artikel.trim());
    if (validArtikel.length > 0) {
      const { error: artError } = await supabase
        .from("ware_in_china_artikel")
        .insert(validArtikel.map((a) => ({ ware_id: bestellung.id, artikel: a.artikel.trim(), anzahl: parseInt(a.anzahl) || 1 })));
      if (artError) { setError(artError.message); setSaving(false); return; }
    }

    setOpen(false);
    router.refresh();
    setSaving(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Bearbeiten
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="text-base font-semibold text-stone-900">Eintrag bearbeiten</h2>
          <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors text-stone-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="label">Typ</label>
            <div className="flex gap-3">
              {TYP_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTyp(value)}
                  className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${
                    typ === value
                      ? value === "LOADING"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : value === "CHECKEN"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-stone-700 bg-stone-100 text-stone-800"
                      : "border-stone-200 bg-white text-stone-400 hover:border-stone-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label">Fabrik</label>
              <input className="input" placeholder="z.B. Guangzhou Electronics Co." value={fabrik} onChange={(e) => setFabrik(e.target.value)} />
            </div>
            <div>
              <label className="label">Geplantes Datum</label>
              <input type="date" className="input" required value={datum} onChange={(e) => setDatum(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Artikel</label>
              <button type="button" onClick={addRow}
                className="inline-flex items-center gap-1 text-xs text-brand-red hover:text-red-700 font-medium transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Hinzufügen
              </button>
            </div>
            <div className="space-y-2">
              {artikel.map((row, i) => (
                <div key={row.id} className="flex gap-2 items-center">
                  <input className="input flex-1" placeholder={`Artikel ${i + 1}`}
                    value={row.artikel} onChange={(e) => updateRow(row.id, "artikel", e.target.value)} />
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs text-stone-400">×</span>
                    <input type="text" className="input w-16 text-center" placeholder="Menge"
                      value={row.anzahl} onChange={(e) => updateRow(row.id, "anzahl", e.target.value)} />
                  </div>
                  {artikel.length > 1 && (
                    <button type="button" onClick={() => removeRow(row.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Notiz</label>
            <textarea rows={3} className="input resize-none" value={notiz} onChange={(e) => setNotiz(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-stone-100">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Abbrechen</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
