"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props { userName: string; }
interface ArtikelRow { id: string; artikel: string; anzahl: string; }

function newRow(): ArtikelRow {
  return { id: Math.random().toString(36).slice(2), artikel: "", anzahl: "" };
}

export default function NewWareForm({ userName }: Props) {
  const [fabrik, setFabrik] = useState("");
  const [orderPiNummer, setOrderPiNummer] = useState("");
  const [notiz, setNotiz] = useState("");
  const [artikel, setArtikel] = useState<ArtikelRow[]>([newRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  function addRow() { setArtikel((prev) => [...prev, newRow()]); }
  function removeRow(id: string) { setArtikel((prev) => prev.filter((r) => r.id !== id)); }
  function updateRow(id: string, field: "artikel" | "anzahl", value: string) {
    setArtikel((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validArtikel = artikel.filter((a) => a.artikel.trim());
    setSaving(true);
    setError("");

    const { data, error: dbError } = await supabase
      .from("ware_in_china")
      .insert({
        fabrik: fabrik.trim() || null,
        order_pi_nummer: orderPiNummer.trim() || null,
        notiz: notiz.trim() || null,
        created_by: userName,
      })
      .select("id")
      .single();

    if (dbError || !data) { setError(dbError?.message ?? "Fehler beim Speichern."); setSaving(false); return; }

    if (validArtikel.length > 0) {
      const { error: artError } = await supabase
        .from("ware_in_china_artikel")
        .insert(validArtikel.map((a) => ({ ware_id: data.id, artikel: a.artikel.trim(), anzahl: parseInt(a.anzahl) || 1 })));
      if (artError) { setError(artError.message); setSaving(false); return; }
    }

    router.push(`/china/ware/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card p-4 space-y-4">
        <div>
          <label className="label">Fabrik <span className="text-stone-400 font-normal">(optional)</span></label>
          <input className="input" placeholder="z.B. Guangzhou Electronics Co." value={fabrik} onChange={(e) => setFabrik(e.target.value)} />
        </div>
        <div>
          <label className="label">Order / PI Nummer <span className="text-stone-400 font-normal">(optional)</span></label>
          <input className="input font-mono" placeholder="z.B. PI-2025-001" value={orderPiNummer} onChange={(e) => setOrderPiNummer(e.target.value)} />
        </div>
      </div>

      {/* Artikel */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="label mb-0">Artikel</label>
          <button type="button" onClick={addRow}
            className="inline-flex items-center gap-1 text-xs text-brand-red hover:text-red-700 font-medium transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Artikel hinzufügen
          </button>
        </div>
        <div className="space-y-2">
          {artikel.map((row, i) => (
            <div key={row.id} className="flex gap-2 items-center">
              <input
                className="input flex-1"
                placeholder={`Artikel ${i + 1}, z.B. Backofen`}
                value={row.artikel}
                onChange={(e) => updateRow(row.id, "artikel", e.target.value)}
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-stone-400">×</span>
                <input
                  type="text"
                  className="input w-16 text-center"
                  placeholder="Menge"
                  value={row.anzahl}
                  onChange={(e) => updateRow(row.id, "anzahl", e.target.value)}
                />
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

      <div className="card p-4">
        <label className="label">Notiz <span className="text-stone-400 font-normal">(optional)</span></label>
        <textarea rows={3} className="input resize-none" placeholder="Weitere Informationen..." value={notiz} onChange={(e) => setNotiz(e.target.value)} />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={() => router.push("/china/ware")}>Abbrechen</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Erstellen..." : "Eintrag erstellen"}
        </button>
      </div>
    </form>
  );
}
