"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  taskId: string;
  currentStatus: string;
  userName: string;
}

export default function TaskStatusModal({ taskId, currentStatus, userName }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"in_bearbeitung" | "erledigt">("erledigt");
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
    const { error: e } = await supabase
      .from("tasks")
      .update({ status: mode, updated_at: now })
      .eq("id", taskId);

    if (e) { setError(e.message); setSaving(false); return; }

    await supabase.from("task_replies").insert({
      task_id: taskId,
      content: mode === "in_bearbeitung"
        ? "Status geändert: In Bearbeitung"
        : "Aufgabe erledigt",
      author: userName,
    });

    setOpen(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {currentStatus === "eingegangen" && (
          <button onClick={() => openModal("in_bearbeitung")} className="btn-secondary">
            In Bearbeitung setzen
          </button>
        )}
        {currentStatus !== "erledigt" && (
          <button onClick={() => openModal("erledigt")} className="btn-primary">
            Erledigen
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-semibold text-stone-900">
                {mode === "in_bearbeitung" ? "In Bearbeitung setzen" : "Aufgabe erledigen"}
              </h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
                  {error}
                </div>
              )}
              <p className="text-stone-600 text-sm">
                {mode === "in_bearbeitung"
                  ? "Der Status wird auf In Bearbeitung gesetzt."
                  : "Die Aufgabe wird als erledigt markiert."}
              </p>
            </div>

            <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="btn-secondary" disabled={saving}>
                Abbrechen
              </button>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? "Speichern..." : "Bestätigen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
