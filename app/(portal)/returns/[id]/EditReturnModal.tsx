"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RESOLUTION_OPTIONS, STATUS_LABELS } from "@/lib/status";

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
    altgeraet: string | null;
    is_outlet: boolean | null;
  };
}

export default function EditReturnModal({ returnId, currentStatus, userName, initialValues }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [orderNumber, setOrderNumber] = useState(initialValues.order_number ?? "");
  const [description, setDescription] = useState(initialValues.description ?? "");
  const [resolution, setResolution] = useState(initialValues.resolution ?? "neu");
  const [resolutionNotes, setResolutionNotes] = useState(initialValues.resolution_notes ?? "");
  const [trackingNumber, setTrackingNumber] = useState(initialValues.tracking_number ?? "");
  const [refundStatus, setRefundStatus] = useState<"ja" | "nein" | "">(
    (initialValues.refund_status as "ja" | "nein" | "") ?? ""
  );
  const [refundNote, setRefundNote] = useState(initialValues.refund_note ?? "");
  const [altgeraet, setAltgeraet] = useState(initialValues.altgeraet ?? "");
  const [isOutlet, setIsOutlet] = useState(initialValues.is_outlet ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  function openModal() {
    setStatus(currentStatus);
    setOrderNumber(initialValues.order_number ?? "");
    setDescription(initialValues.description ?? "");
    setResolution(initialValues.resolution ?? "neu");
    setResolutionNotes(initialValues.resolution_notes ?? "");
    setTrackingNumber(initialValues.tracking_number ?? "");
    setRefundStatus((initialValues.refund_status as "ja" | "nein" | "") ?? "");
    setRefundNote(initialValues.refund_note ?? "");
    setAltgeraet(initialValues.altgeraet ?? "");
    setIsOutlet(initialValues.is_outlet ?? false);
    setError("");
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const now = new Date().toISOString();
    const updates: Record<string, string | null | boolean> = {
      status,
      order_number: orderNumber.trim() || null,
      description: description.trim() || null,
      updated_at: now,
      is_outlet: isOutlet,
    };

    if (status === "erledigt") {
      updates.resolution = resolution;
      updates.resolution_notes = resolutionNotes.trim() || null;
      updates.tracking_number = trackingNumber.trim() || null;
      if (resolution === "austausch") {
        updates.altgeraet = altgeraet.trim() || null;
      }
      if (refundStatus) {
        updates.refund_status = refundStatus;
        updates.refund_note = refundNote.trim() || null;
      }
    }

    if (status === "wieder_an_kunde") {
      updates.tracking_number = trackingNumber.trim() || null;
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

    const statusChanged = status !== currentStatus;
    await supabase.from("return_events").insert({
      return_id: returnId,
      event_type: statusChanged ? "status_geaendert" : "bearbeitet",
      note: statusChanged
        ? `Status geändert: ${STATUS_LABELS[currentStatus]?.label ?? currentStatus} → ${STATUS_LABELS[status]?.label ?? status}`
        : "Retoure bearbeitet / korrigiert",
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

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`relative w-11 h-6 flex-shrink-0 rounded-full transition-colors ${isOutlet ? "bg-amber-500" : "bg-stone-300"}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isOutlet ? "translate-x-5" : ""}`} />
                    <input type="checkbox" className="sr-only" checked={isOutlet} onChange={(e) => setIsOutlet(e.target.checked)} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-stone-900">Outlet</div>
                    <div className="text-xs text-stone-500">Als Outlet-Artikel kennzeichnen</div>
                  </div>
                </label>
              </div>

              <div>
                <label className="label">Status</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABELS).map(([value, { label, className }]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatus(value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        status === value
                          ? `${className} ring-2 ring-offset-1 ring-current`
                          : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {status === "wieder_an_kunde" && (
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
              )}

              {status === "erledigt" && (
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

                  {resolution === "austausch" && (
                    <div>
                      <label className="label">
                        Altgerät <span className="text-stone-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder="z.B. Modell / Seriennummer des Altgeräts..."
                        value={altgeraet}
                        onChange={(e) => setAltgeraet(e.target.value)}
                      />
                    </div>
                  )}

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
