"use client";

import { useState } from "react";
import { archiveReturn } from "./actions";

export default function ReturnArchiveButton({ returnId }: { returnId: string }) {
  const [open, setOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  async function handleArchive() {
    setArchiving(true);
    await archiveReturn(returnId);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-600 shadow-sm transition hover:bg-stone-50 hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:ring-offset-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12h4" />
        </svg>
        Archivieren
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-stone-200">
              <h2 className="font-semibold text-stone-900">Retoure archivieren</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-stone-600">
                Die Retoure wird ins Archiv verschoben und erscheint nicht mehr in der Hauptliste. Sie kann jederzeit wiederhergestellt werden.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} disabled={archiving} className="btn-secondary">
                Abbrechen
              </button>
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800 focus:outline-none disabled:opacity-50"
              >
                {archiving ? "Wird archiviert..." : "Archivieren"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
