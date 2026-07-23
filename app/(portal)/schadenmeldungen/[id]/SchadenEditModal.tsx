"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  schadenId: string;
  current: {
    gel_nummer: string;
    auftragsnummer: string | null;
    artikel: string | null;
    beschreibung: string | null;
    rechnungsnummer: string | null;
    status: string;
    unterlagen_gesendet: boolean;
  };
}

export default function SchadenEditModal({ schadenId, current }: Props) {
  const [open, setOpen] = useState(false);
  const [gelNummer, setGelNummer] = useState(current.gel_nummer);
  const [auftragsnummer, setAuftragsnummer] = useState(current.auftragsnummer ?? "");
  const [artikel, setArtikel] = useState(current.artikel ?? "");
  const [beschreibung, setBeschreibung] = useState(current.beschreibung ?? "");
  const [rechnungsnummer, setRechnungsnummer] = useState(current.rechnungsnummer ?? "");
  const [status, setStatus] = useState(current.status);
  const [unterlagenGesendet, setUnterlagenGesendet] = useState(current.unterlagen_gesendet);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  function openModal() {
    setGelNummer(current.gel_nummer);
    setAuftragsnummer(current.auftragsnummer ?? "");
    setArtikel(current.artikel ?? "");
    setBeschreibung(current.beschreibung ?? "");
    setRechnungsnummer(current.rechnungsnummer ?? "");
    setStatus(current.status);
    setUnterlagenGesendet(current.unterlagen_gesendet);
    setError("");
    setOpen(true);
  }

  async function handleSave() {
    if (!gelNummer.trim()) { setError("GEL Nummer ist erforderlich."); return; }
    setSaving(true); setError("");

    const { error: e } = await supabase
      .from("schadenmeldungen")
      .update({
        gel_nummer: gelNummer.trim(),
        auftragsnummer: auftragsnummer.trim() || null,
        artikel: artikel.trim() || null,
        beschreibung: beschreibung.trim() || null,
        rechnungsnummer: rechnungsnummer.trim() || null,
        status,
        unterlagen_gesendet: unterlagenGesendet,
        updated_at: new Date().toISOString(),
      })
      .eq("id", schadenId);

    if (e) { setError(e.message); setSaving(false); return; }
    setOpen(false); setSaving(false);
    router.refresh();
  }

  return (
    <>
      <button onClick={openModal} className="btn-secondary">Bearbeiten</button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-stone-900">Schadenmeldung bearbeiten</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <div>
                <label className="label">Status</label>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="offen">Offen</option>
                  <option value="reguliert">Reguliert</option>
                  <option value="bezahlt">Bezahlt</option>

                </select>
              </div>

              <div>
                <label className="label">GEL Nummer <span className="text-brand-red">*</span></label>
                <input className="input" value={gelNummer} onChange={(e) => setGelNummer(e.target.value)} />
              </div>

              <div>
                <label className="label">Auftragsnummer</label>
                <input className="input" value={auftragsnummer} onChange={(e) => setAuftragsnummer(e.target.value)} />
              </div>

              <div>
                <label className="label">Artikel</label>
                <input className="input" value={artikel} onChange={(e) => setArtikel(e.target.value)} />
              </div>

              <div>
                <label className="label">Beschreibung</label>
                <textarea rows={3} className="input resize-none" value={beschreibung}
                  onChange={(e) => setBeschreibung(e.target.value)} />
              </div>

              <div>
                <label className="label">Rechnungsnummer</label>
                <input className="input" placeholder="z.B. RE-2024-001" value={rechnungsnummer}
                  onChange={(e) => setRechnungsnummer(e.target.value)} />
              </div>

              <div>
                <label className="label">Unterlagen an GEL gesendet?</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`unterlagen-${schadenId}`}
                      checked={unterlagenGesendet === true}
                      onChange={() => setUnterlagenGesendet(true)}
                      className="accent-brand-red"
                    />
                    <span className="text-sm text-stone-700">Ja</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`unterlagen-${schadenId}`}
                      checked={unterlagenGesendet === false}
                      onChange={() => setUnterlagenGesendet(false)}
                      className="accent-brand-red"
                    />
                    <span className="text-sm text-stone-700">Nein</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setOpen(false)} className="btn-secondary" disabled={saving}>Abbrechen</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
