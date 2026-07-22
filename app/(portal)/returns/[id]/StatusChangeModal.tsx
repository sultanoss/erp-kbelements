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

export default function StatusChangeModal({ returnId, currentStatus, userName }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"in_bearbeitung" | "erledigt">("erledigt");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [resolution, setResolution] = useState("neu");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  function openModal(m: typeof mode) {
    setMode(m);
    setOpen(true);
    setError("");
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
    } else {
      if (!resolutionNotes.trim()) {
        setError("Bitte beschreiben was gemacht wurde.");
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
          updated_at: now,
        })
        .eq("id", returnId);

      if (e) { setError(e.message); setSaving(false); return; }

      await supabase.from("return_events").insert({
        return_id: returnId,
        event_type: "erledigt",
        note: `${RESOLUTION_OPTIONS.find(o => o.value === resolution)?.label ?? resolution}${trackingNumber ? ` · Sendung: ${trackingNumber}` : ""}\n\n${resolutionNotes}`,
        author: userName,
      });
    }

    setOpen(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <>
      {/* Buttons */}
      <div className="flex gap-2 flex-wrap">
        {currentStatus === "eingegangen" && (
          <button
            onClick={() => openModal("in_bearbeitung")}
            className="btn-secondary"
          >
            In Bearbeitung setzen
          </button>
        )}
        <button
          onClick={() => openModal("erledigt")}
          className="btn-primary"
        >
          Erledigen
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-semibold text-stone-900">
                {mode === "in_bearbeitung" ? "In Bearbeitung setzen" : "Retoure erledigen"}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
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

              {mode === "erledigt" && (
                <>
                  <div>
                    <label className="label">Abschluss-Kategorie</label>
                    <select
                      className="input"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                    >
                      {RESOLUTION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      Was wurde gemacht? <span className="text-brand-red">*</span>
                    </label>
                    <textarea
                      rows={4}
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
                </>
              )}

              {mode === "in_bearbeitung" && (
                <p className="text-stone-600 text-sm">
                  Der Status wird auf <strong>In Bearbeitung</strong> gesetzt. Du kannst danach weitere Details hinzufügen.
                </p>
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
