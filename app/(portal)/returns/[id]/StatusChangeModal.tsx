"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RESOLUTION_OPTIONS } from "@/lib/status";

interface Props {
  returnId: string;
  currentStatus: string;
  userName: string;
}

type Mode = "in_bearbeitung" | "erledigt" | "nicht_zustellbar" | "wieder_an_kunde" | "klaeren_mit_kunde" | "warte_auf_kunde_antwort";

export default function StatusChangeModal({ returnId, currentStatus, userName }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("erledigt");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [resolution, setResolution] = useState("neu");
  const [refundStatus, setRefundStatus] = useState<"ja" | "nein" | "">("");
  const [refundReason, setRefundReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  function openModal(m: Mode) {
    setMode(m);
    setOpen(true);
    setError("");
    setRefundStatus("");
    setRefundReason("");
    setTrackingNumber("");
    setResolutionNotes("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const now = new Date().toISOString();

    if (mode === "in_bearbeitung") {
      const { error: e } = await supabase
        .from("returns")
        .update({ status: "in_bearbeitung", updated_at: now })
        .eq("id", returnId);

      if (e) { setError(e.message); setSaving(false); return; }

      await supabase.from("return_events").insert({
        return_id: returnId,
        event_type: "status_geaendert",
        note: "Status geändert: In Bearbeitung",
        author: userName,
      });

    } else if (mode === "klaeren_mit_kunde") {
      const { error: e } = await supabase
        .from("returns")
        .update({ status: "klaeren_mit_kunde", updated_at: now })
        .eq("id", returnId);

      if (e) { setError(e.message); setSaving(false); return; }

      await supabase.from("return_events").insert({
        return_id: returnId,
        event_type: "status_geaendert",
        note: "Status geändert: Klären mit Kunde",
        author: userName,
      });

    } else if (mode === "nicht_zustellbar") {
      const { error: e } = await supabase
        .from("returns")
        .update({ status: "nicht_zustellbar", updated_at: now })
        .eq("id", returnId);

      if (e) { setError(e.message); setSaving(false); return; }

      await supabase.from("return_events").insert({
        return_id: returnId,
        event_type: "status_geaendert",
        note: "Status geändert: Nicht zustellbar",
        author: userName,
      });

    } else if (mode === "wieder_an_kunde") {
      if (!trackingNumber.trim()) {
        setError("Bitte eine neue Sendungsnummer eingeben.");
        setSaving(false);
        return;
      }

      const { error: e } = await supabase
        .from("returns")
        .update({ status: "wieder_an_kunde", tracking_number: trackingNumber.trim(), updated_at: now })
        .eq("id", returnId);

      if (e) { setError(e.message); setSaving(false); return; }

      await supabase.from("return_events").insert({
        return_id: returnId,
        event_type: "status_geaendert",
        note: `Status geändert: Wieder an Kunde · Sendung: ${trackingNumber.trim()}`,
        author: userName,
      });

    } else if (mode === "warte_auf_kunde_antwort") {
      const { error: e } = await supabase
        .from("returns")
        .update({ status: "warte_auf_kunde_antwort", updated_at: now })
        .eq("id", returnId);

      if (e) { setError(e.message); setSaving(false); return; }

      await supabase.from("return_events").insert({
        return_id: returnId,
        event_type: "status_geaendert",
        note: "Warte auf Kunden-Antwort",
        author: userName,
      });

    } else {
      if (!refundStatus) {
        setError("Bitte angeben ob Geld zurückerstattet wurde.");
        setSaving(false);
        return;
      }
      if (refundStatus === "nein" && !refundReason.trim()) {
        setError("Bitte einen Grund angeben warum nicht erstattet wurde.");
        setSaving(false);
        return;
      }

      const { error: e } = await supabase
        .from("returns")
        .update({
          status: "erledigt",
          resolution,
          resolved_by: userName,
          resolved_at: now,
          resolution_notes: resolutionNotes,
          tracking_number: trackingNumber || null,
          refund_status: refundStatus,
          refund_reason: refundStatus === "nein" ? refundReason.trim() : null,
          updated_at: now,
        })
        .eq("id", returnId);

      if (e) { setError(e.message); setSaving(false); return; }

      const refundNote = refundStatus === "ja"
        ? "Geld erstattet: Ja"
        : `Geld erstattet: Nein — ${refundReason.trim()}`;

      await supabase.from("return_events").insert({
        return_id: returnId,
        event_type: "erledigt",
        note: `${RESOLUTION_OPTIONS.find(o => o.value === resolution)?.label ?? resolution}${trackingNumber ? ` · Sendung: ${trackingNumber}` : ""}\n${refundNote}\n\n${resolutionNotes}`,
        author: userName,
      });
    }

    setOpen(false);
    setSaving(false);
    router.refresh();
  }

  const modalTitle: Record<Mode, string> = {
    in_bearbeitung:          "In Bearbeitung setzen",
    erledigt:                "Retoure erledigen",
    nicht_zustellbar:        "Nicht zustellbar markieren",
    wieder_an_kunde:         "Wieder an Kunde senden",
    klaeren_mit_kunde:       "Klären mit Kunde",
    warte_auf_kunde_antwort: "Warte auf Kunden-Antwort",
  };

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {(currentStatus === "eingegangen" || currentStatus === "klaeren_mit_kunde" || currentStatus === "warte_auf_kunde_antwort") && (
          <button onClick={() => openModal("in_bearbeitung")} className="btn-secondary">
            In Bearbeitung setzen
          </button>
        )}
        {(currentStatus === "eingegangen" || currentStatus === "in_bearbeitung" || currentStatus === "klaeren_mit_kunde") && (
          <button onClick={() => openModal("nicht_zustellbar")} className="btn-secondary">
            Nicht zustellbar
          </button>
        )}
        {(currentStatus === "eingegangen" || currentStatus === "in_bearbeitung") && (
          <button onClick={() => openModal("klaeren_mit_kunde")} className="btn-secondary">
            Klären mit Kunde
          </button>
        )}
        {(currentStatus === "eingegangen" || currentStatus === "in_bearbeitung" || currentStatus === "klaeren_mit_kunde") && (
          <button onClick={() => openModal("warte_auf_kunde_antwort")} className="btn-secondary">
            Warte auf Kunden-Antwort
          </button>
        )}
        {currentStatus === "nicht_zustellbar" && (
          <button onClick={() => openModal("wieder_an_kunde")} className="btn-secondary">
            Wieder an Kunde
          </button>
        )}
        <button onClick={() => openModal("erledigt")} className="btn-primary">
          Erledigen
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-semibold text-stone-900">{modalTitle[mode]}</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {mode === "warte_auf_kunde_antwort" && (
                <p className="text-stone-600 text-sm">
                  Der Status wird auf <strong>Warte auf Kunden-Antwort</strong> gesetzt. Das Hinweis-Badge &ldquo;Neue Antwort&rdquo; wird ausgeblendet bis eine neue Nachricht im Verlauf eingeht.
                </p>
              )}

              {mode === "in_bearbeitung" && (
                <p className="text-stone-600 text-sm">
                  Der Status wird auf <strong>In Bearbeitung</strong> gesetzt.
                </p>
              )}

              {mode === "klaeren_mit_kunde" && (
                <p className="text-stone-600 text-sm">
                  Der Status wird auf <strong>Klären mit Kunde</strong> gesetzt. Der Kunde wird kontaktiert um die Situation zu klären.
                </p>
              )}

              {mode === "nicht_zustellbar" && (
                <p className="text-stone-600 text-sm">
                  Das Paket konnte nicht zugestellt werden. Der Status wird auf <strong>Nicht zustellbar</strong> gesetzt. Der Kunde wird kontaktiert.
                </p>
              )}

              {mode === "wieder_an_kunde" && (
                <div className="space-y-3">
                  <p className="text-stone-600 text-sm">
                    Das Paket wird erneut an den Kunden gesendet. Bitte die neue Sendungsnummer eingeben.
                  </p>
                  <div>
                    <label className="label">
                      Neue Sendungsnummer <span className="text-brand-red">*</span>
                    </label>
                    <input
                      type="text"
                      className="input font-mono"
                      placeholder="z.B. 1234 5678 9012"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {mode === "erledigt" && (
                <>
                  <div>
                    <label className="label">Abschluss-Kategorie</label>
                    <select className="input" value={resolution} onChange={(e) => setResolution(e.target.value)}>
                      {RESOLUTION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      Was wurde gemacht? <span className="text-stone-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      className="input resize-none"
                      placeholder="z.B. Repariert und an Kunden gesendet..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label">
                      Sendungsnummer <span className="text-stone-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      className="input font-mono"
                      placeholder="z.B. 1234 5678 9012"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                    />
                  </div>

                  <div className="rounded-lg border border-stone-200 p-4 space-y-3">
                    <label className="label mb-0">
                      Geld zurückerstattet? <span className="text-brand-red">*</span>
                    </label>
                    <div className="flex gap-3">
                      <label className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 cursor-pointer transition-colors ${
                        refundStatus === "ja"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-stone-200 text-stone-600 hover:border-stone-300"
                      }`}>
                        <input
                          type="radio"
                          className="sr-only"
                          name="refund"
                          value="ja"
                          checked={refundStatus === "ja"}
                          onChange={() => { setRefundStatus("ja"); setRefundReason(""); }}
                        />
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium">Ja</span>
                      </label>
                      <label className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 cursor-pointer transition-colors ${
                        refundStatus === "nein"
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-stone-200 text-stone-600 hover:border-stone-300"
                      }`}>
                        <input
                          type="radio"
                          className="sr-only"
                          name="refund"
                          value="nein"
                          checked={refundStatus === "nein"}
                          onChange={() => setRefundStatus("nein")}
                        />
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-sm font-medium">Nein</span>
                      </label>
                    </div>

                    {refundStatus === "nein" && (
                      <div>
                        <label className="label">
                          Grund <span className="text-brand-red">*</span>
                        </label>
                        <input
                          type="text"
                          className="input"
                          placeholder="z.B. Ware beschädigt, Garantiefall..."
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="btn-secondary" disabled={saving}>
                Abbrechen
              </button>
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
