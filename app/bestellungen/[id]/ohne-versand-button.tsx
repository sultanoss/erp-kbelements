"use client";

import { useState, useTransition } from "react";
import { markAsAbgeschlossen } from "./actions";

export function OhneVersandButton({ orderId }: { orderId: string }) {
  const [showDialog, setShowDialog] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setShowDialog(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", orderId);
      await markAsAbgeschlossen(fd);
    });
  }

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        disabled={pending}
        className="w-full rounded-lg border border-grey-border bg-white px-4 py-2 font-mono text-xs text-grey-mid hover:border-brand-red hover:text-brand-red disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Wird abgeschlossen…" : "Ohne Versand abschließen (kein Lagerabzug)"}
      </button>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 space-y-4">
            <p className="font-semibold text-gray-900 text-sm">Bestellung ohne Versand abschließen?</p>
            <p className="text-xs text-gray-500">Es wird kein Label erstellt und kein Lagerbestand abgezogen. Die Bestellung wird als abgeschlossen markiert.</p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-lg border border-brand-red bg-brand-red px-3 py-2 font-mono text-xs font-semibold text-white hover:bg-brand-red-dark transition-colors"
              >
                Ja, abschließen
              </button>
              <button
                onClick={() => setShowDialog(false)}
                className="flex-1 rounded-lg border border-grey-border px-3 py-2 font-mono text-xs font-semibold text-grey-mid hover:border-grey-dark hover:text-grey-dark transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
