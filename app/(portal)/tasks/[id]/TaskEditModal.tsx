"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TASK_TYPE_OPTIONS } from "@/lib/status";

interface Props {
  taskId: string;
  currentTags: string[];
  currentDescription: string;
  currentAssignedTo: string[] | null;
  currentIsUrgent: boolean;
  currentSendungsnummer: string | null;
  currentStatus: string;
  users: Array<{ id: string; email: string; full_name: string }>;
}

export default function TaskEditModal({
  taskId,
  currentTags,
  currentDescription,
  currentAssignedTo,
  currentIsUrgent,
  currentSendungsnummer,
  currentStatus,
  users,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(currentTags);
  const [description, setDescription] = useState(currentDescription);
  const [assignedTo, setAssignedTo] = useState<string[]>(currentAssignedTo ?? []);
  const [isUrgent, setIsUrgent] = useState(currentIsUrgent);
  const [sendungsnummer, setSendungsnummer] = useState(currentSendungsnummer ?? "");
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  function openModal() {
    setTags(currentTags);
    setDescription(currentDescription);
    setAssignedTo(currentAssignedTo ?? []);
    setIsUrgent(currentIsUrgent);
    setSendungsnummer(currentSendungsnummer ?? "");
    setStatus(currentStatus);
    setError("");
    setOpen(true);
  }

  function toggleTag(val: string) {
    setTags((prev) => (prev[0] === val ? [] : [val]));
  }

  function toggleUser(email: string) {
    setAssignedTo((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  }

  async function handleSave() {
    if (!description.trim()) { setError("Beschreibung ist erforderlich."); return; }
    setSaving(true);
    setError("");

    const { error: e } = await supabase
      .from("tasks")
      .update({
        tags,
        description: description.trim(),
        assigned_to: assignedTo,
        is_urgent: isUrgent,
        sendungsnummer: sendungsnummer.trim() || null,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (e) { setError(e.message); setSaving(false); return; }

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
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-stone-900">Aufgabe bearbeiten</h2>
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

              {/* Priorität */}
              <div>
                <label className="label">Priorität</label>
                <button
                  type="button"
                  onClick={() => setIsUrgent((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium border-2 transition-colors ${
                    isUrgent
                      ? "border-red-600 bg-red-50 text-red-700"
                      : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  Dringend
                </button>
              </div>

              {/* Status */}
              <div>
                <label className="label">Status</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {[
                    { value: "eingegangen",    label: "Eingegangen",    cls: "border-blue-400 bg-blue-50 text-blue-700" },
                    { value: "in_bearbeitung", label: "In Bearbeitung", cls: "border-amber-400 bg-amber-50 text-amber-700" },
                    { value: "erledigt",       label: "Erledigt",       cls: "border-green-500 bg-green-50 text-green-700" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium border-2 transition-colors ${
                        status === opt.value
                          ? opt.cls
                          : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag */}
              <div>
                <label className="label">Tag</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {TASK_TYPE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleTag(o.value)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium border-2 transition-colors ${
                        tags.includes(o.value)
                          ? "border-brand-red bg-red-50 text-brand-red"
                          : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Beschreibung */}
              <div>
                <label className="label">Beschreibung <span className="text-brand-red">*</span></label>
                <textarea
                  rows={4}
                  className="input resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Sendungsnummer */}
              <div>
                <label className="label">Sendungsnummer <span className="text-stone-400 font-normal">(optional)</span></label>
                <input
                  className="input"
                  placeholder="z.B. 00340434179490000001"
                  value={sendungsnummer}
                  onChange={(e) => setSendungsnummer(e.target.value)}
                />
              </div>

              {/* Zugewiesen an */}
              <div>
                <label className="label">
                  Zugewiesen an <span className="text-stone-400 font-normal">(mehrere möglich)</span>
                </label>
                {users.length === 0 ? (
                  <p className="text-sm text-stone-400 mt-1">Keine Benutzer verfügbar.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleUser(u.email)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium border-2 transition-colors ${
                          assignedTo.includes(u.email)
                            ? "border-brand-red bg-red-50 text-brand-red"
                            : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        {u.full_name || u.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-3 sticky bottom-0 bg-white">
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
