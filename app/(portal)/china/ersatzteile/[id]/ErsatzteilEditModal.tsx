"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  eintrag: { id: string; produkt: string; fabrik: string | null; notiz: string | null; };
}

export default function ErsatzteilEditModal({ eintrag }: Props) {
  const [open, setOpen] = useState(false);
  const [produkt, setProdukt] = useState(eintrag.produkt);
  const [fabrik, setFabrik] = useState(eintrag.fabrik ?? "");
  const [notiz, setNotiz] = useState(eintrag.notiz ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    if (!produkt.trim()) { setError("Produkt ist erforderlich."); return; }
    setSaving(true);
    setError("");

    const { error: dbError } = await supabase
      .from("ware_in_china")
      .update({
        order_pi_nummer: `ERSATZTEIL:${produkt.trim()}`,
        fabrik: fabrik.trim() || null,
        notiz: notiz.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eintrag.id);

    if (dbError) { setError(dbError.message); setSaving(false); return; }
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
          <h2 className="text-base font-semibold text-stone-900">Ersatzteil bearbeiten</h2>
          <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors text-stone-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="label">Produkt</label>
            <input className="input" placeholder="z.B. Lüftermotor" value={produkt} onChange={(e) => setProdukt(e.target.value)} required />
          </div>
          <div>
            <label className="label">Fabrik</label>
            <input className="input" placeholder="z.B. Guangzhou Electronics Co." value={fabrik} onChange={(e) => setFabrik(e.target.value)} />
          </div>
          <div>
            <label className="label">Notiz</label>
            <textarea rows={4} className="input resize-none" value={notiz} onChange={(e) => setNotiz(e.target.value)} />
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
