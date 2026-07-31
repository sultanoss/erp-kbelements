"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { storniereBestellung } from "./actions";

export function StorniereButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();

  function handleStorno(lager: "neuware" | "ns") {
    setShowDialog(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", orderId);
      fd.append("lager", lager);
      await storniereBestellung(fd);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        disabled={pending}
        className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-mono text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Wird storniert…" : "Bestellung stornieren"}
      </button>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 space-y-4">
            <p className="font-semibold text-gray-900 text-sm">Bestellung wirklich stornieren?</p>
            <p className="text-xs text-gray-500">Rechnung wird storniert. In welches Lager soll die Ware zurückgebucht werden?</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleStorno("neuware")}
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs font-semibold text-gray-700 hover:border-brand-red hover:text-brand-red transition-colors"
              >
                Neuware-Lager
              </button>
              <button
                onClick={() => handleStorno("ns")}
                className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 font-mono text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                NS-Lager
              </button>
            </div>
            <button
              onClick={() => setShowDialog(false)}
              className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </>
  );
}
