"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  bestellung: {
    id: string;
    order_pi_nummer: string | null;
    fabrik: string | null;
    angezahlt: boolean;
    angezahlt_notiz: string | null;
    bezahlt: boolean;
    bezahlt_notiz: string | null;
    notiz: string | null;
    produktion_fertig: string | null;
    ankunft_erwartet: string | null;
    verschifft: boolean;
    tracking_nummer: string | null;
    lager_ankunft: string | null;
    lager_ankunft_uhrzeit: string | null;
  };
}

function BoolToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {[{ v: true, label: "Ja", active: "border-green-500 bg-green-50 text-green-700" },
        { v: false, label: "Nein", active: "border-stone-400 bg-stone-100 text-stone-700" }].map(({ v, label, active }) => (
        <button key={String(v)} type="button" onClick={() => onChange(v)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${value === v ? active : "border-stone-200 text-stone-500 hover:border-stone-300"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function ChinaEditModal({ bestellung }: Props) {
  const [open, setOpen] = useState(false);
  const [orderPiNummer, setOrderPiNummer] = useState(bestellung.order_pi_nummer ?? "");
  const [fabrik, setFabrik] = useState(bestellung.fabrik ?? "");
  const [angezahlt, setAngezahlt] = useState(bestellung.angezahlt);
  const [angezahltNotiz, setAngezahltNotiz] = useState(bestellung.angezahlt_notiz ?? "");
  const [bezahlt, setBezahlt] = useState(bestellung.bezahlt);
  const [bezahltNotiz, setBezahltNotiz] = useState(bestellung.bezahlt_notiz ?? "");
  const [notiz, setNotiz] = useState(bestellung.notiz ?? "");
  const [produktionFertig, setProduktionFertig] = useState(bestellung.produktion_fertig ?? "");
  const [ankunftErwartet, setAnkunftErwartet] = useState(bestellung.ankunft_erwartet ?? "");
  const [verschifft, setVerschifft] = useState(bestellung.verschifft);
  const [trackingNummer, setTrackingNummer] = useState(bestellung.tracking_nummer ?? "");
  const [lagerAnkunft, setLagerAnkunft] = useState(bestellung.lager_ankunft ?? "");
  const [lagerAnkunftUhrzeit, setLagerAnkunftUhrzeit] = useState(bestellung.lager_ankunft_uhrzeit ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    setSaving(true);
    setError("");
    const { error: dbError } = await supabase
      .from("china_bestellungen")
      .update({
        order_pi_nummer: orderPiNummer.trim() || null,
        fabrik: fabrik.trim() || null,
        angezahlt,
        angezahlt_notiz: angezahltNotiz.trim() || null,
        bezahlt,
        bezahlt_notiz: bezahltNotiz.trim() || null,
        notiz: notiz.trim() || null,
        produktion_fertig: produktionFertig || null,
        ankunft_erwartet: ankunftErwartet || null,
        verschifft,
        tracking_nummer: trackingNummer.trim() || null,
        lager_ankunft: lagerAnkunft || null,
        lager_ankunft_uhrzeit: lagerAnkunftUhrzeit || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bestellung.id);

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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="text-base font-semibold text-stone-900">Bestellung bearbeiten</h2>
          <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors text-stone-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-3">
            <div>
              <label className="label">Order / PI Nummer</label>
              <input className="input font-mono" placeholder="z.B. PI-2025-001" value={orderPiNummer} onChange={(e) => setOrderPiNummer(e.target.value)} />
            </div>
            <div>
              <label className="label">Fabrik</label>
              <input className="input" placeholder="z.B. Guangzhou Electronics Co." value={fabrik} onChange={(e) => setFabrik(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="label">Angezahlt</label>
            <BoolToggle value={angezahlt} onChange={setAngezahlt} />
            {angezahlt && (
              <input className="input mt-2" placeholder="z.B. 30% = 5.000 € überwiesen am 01.01.2025" value={angezahltNotiz} onChange={(e) => setAngezahltNotiz(e.target.value)} />
            )}
          </div>

          <div className="space-y-2">
            <label className="label">Vollständig bezahlt</label>
            <BoolToggle value={bezahlt} onChange={setBezahlt} />
            {bezahlt && (
              <input className="input mt-2" placeholder="z.B. Restbetrag 10.000 € am 15.02.2025" value={bezahltNotiz} onChange={(e) => setBezahltNotiz(e.target.value)} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Produktion fertig</label>
              <input type="date" className="input" value={produktionFertig} onChange={(e) => setProduktionFertig(e.target.value)} />
            </div>
            <div>
              <label className="label">Ankunft erwartet</label>
              <input type="date" className="input" value={ankunftErwartet} onChange={(e) => setAnkunftErwartet(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="label">Verschifft</label>
            <BoolToggle value={verschifft} onChange={setVerschifft} />
            {verschifft && (
              <input className="input font-mono mt-2" placeholder="z.B. MSKU1234567" value={trackingNummer} onChange={(e) => setTrackingNummer(e.target.value)} />
            )}
          </div>

          <div>
            <label className="label">Lager Ankunft</label>
            <div className="flex gap-2">
              <input type="date" className="input flex-1" value={lagerAnkunft} onChange={(e) => setLagerAnkunft(e.target.value)} />
              <input type="time" className="input w-32" value={lagerAnkunftUhrzeit} onChange={(e) => setLagerAnkunftUhrzeit(e.target.value)} placeholder="Uhrzeit" />
            </div>
          </div>

          <div>
            <label className="label">Allgemeine Notiz</label>
            <textarea rows={3} className="input resize-none" placeholder="Weitere Informationen..." value={notiz} onChange={(e) => setNotiz(e.target.value)} />
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
