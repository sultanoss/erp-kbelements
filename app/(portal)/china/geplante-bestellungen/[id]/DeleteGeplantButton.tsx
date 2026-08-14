"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteGeplantBestellung } from "./actions";

export default function DeleteGeplantButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    const result = await deleteGeplantBestellung(id);
    if (result.error) { alert(result.error); setLoading(false); return; }
    router.push("/china/geplante-bestellungen");
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-500">Sicher?</span>
        <button onClick={handleDelete} disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
          {loading ? "Löschen…" : "Ja, löschen"}
        </button>
        <button onClick={() => setConfirm(false)} disabled={loading}
          className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors">
          Abbrechen
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-red-300 hover:text-red-600 transition-colors">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Löschen
    </button>
  );
}
