"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RESOLUTION_OPTIONS } from "@/lib/status";

interface Props {
  returnId: string;
  currentStatus: string;
  userName: string;
  initialValues: {
    order_number: string | null;
    description: string | null;
    resolution: string | null;
    resolution_notes: string | null;
    tracking_number: string | null;
    refund_status: string | null;
    refund_note: string | null;
  };
}

export default function EditReturnModal({ returnId, currentStatus, userName, initialValues }: Props) {
  const [open, setOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState(initialValues.order_number ?? "");
  const [description, setDescription] = useState(initialValues.description ?? "");
  const [resolution, setResolution] = useState(initialValues.resolution ?? "neu");
  const [resolutionNotes, setResolutionNotes] = useState(initialValues.resolution_notes ?? "");
  const [trackingNumber, setTrackingNumber] = useState(initialValues.tracking_number ?? "");
  const [refundStatus, setRefundStatus] = useState<"ja" | "nein" | "">(
    (initialValues.refund_status as "ja" | "nein" | "") ?? ""
  );
  const [refundNote, setRefundNote] = useState(initialValues.refund_note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  function openModal() {
    setOrderNumber(initialValues.order_number ?? "");
    setDescription(initialValues.description ?? "");
    setResolution(initialValues.resolution ?? "neu");
    setResolutionNotes(initialValues.resolution_notes ?? "");
    setTrackingNumber(initialValues.tracking_number ?? "");
    setRefundStatus((initialValues.refund_status as "ja" | "nein" | "") ?? "");
    setRefundNote(initialValues.refund_note ?? "");
    setError("");
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const now = new Date().toISOString();
    const updates: Record<string, string | null> = {
      order_number: orderNumber.trim() || null,
      description: description.trim() || null,
      updated_at: now,
    };

    if (currentStatus === "erledigt") {
      updates.resolution = resolution;
      updates.resolution_notes = resolutionNotes.trim() || null;
      updates.tracking_number = trackingNumber.trim() || null;
      if (refundStatus) {
        updates.refund_status = refundStatus;
        updates.refund_note = refundNote.trim() || null;
      }
    }

    const { error: e } = await supabase
      .from("returns")
      .update(updates)
      .eq("id", returnId);

    if (e) {
      setError(e.message);
      setSaving(false);
      return;
    }

    await supabase.from("return_events").insert({
      return_id: returnId,
      event_type: "bearbeitet",
      note: "Retoure bearbeitet / korrigiert",
      author: userName,
    });

    setOpen(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <>
      <button onClick={openModal} className="btn-secondary">
        Bearbeiten
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-semibold text-stone-900">Retoure bearbeiten</h2>
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

              <div>
                <label className="label">
                  Auftragsnummer <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  className="input font-mono"
                  placeholder="z.B. 12345"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="label">
                  Beschreibung <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  className="input resize-none"
                  placeholder="Beschreibung des Problems..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {currentStatus === "erledigt" && (
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

                  {/* Erstattung */}
                  <div className="rounded-lg border border-stone-200 p-4 space-y-3">
                    <label className="label mb-0">
                      Erstattungsstatus <span className="text-stone-400 font-normal">(optional)</span>
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
                          name="edit-refund"
                          value="ja"
                          checked={refundStatus === "ja"}
                          onChange={() => setRefundStatus("ja")}
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
                          name="edit-refund"
                          value="nein"
                          checked={refundStatus === "nein"}
                          onChange={() => setRefundStatus("nein")}
                        />
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-sm font-medium">Nein</span>
                      </label>
                      <label className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 cursor-pointer transition-colors ${
                        refundStatus === ""
                          ? "border-stone-400 bg-stone-50 text-stone-700"
                          : "border-stone-200 text-stone-500 hover:border-stone-300"
                      }`}>
                        <input
                          type="radio"
                          className="sr-only"
                          name="edit-refund"
                          value=""
                          checked={refundStatus === ""}
                          onChange={() => setRefundStatus("")}
                        />
                        <span className="text-sm">—</span>
                      </label>
                    </div>

                    {refundStatus !== "" && (
                      <div>
                        <label className="label">
                          Notiz <span className="text-stone-400 font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          className="input"
                          placeholder="z.B. Teilrückerstattung 29,99 €..."
                          value={refundNote}
                          onChange={(e) => setRefundNote(e.target.value)}
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
