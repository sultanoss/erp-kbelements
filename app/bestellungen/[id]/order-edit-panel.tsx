"use client";

import { useState, useTransition } from "react";
import { updateOrderNote, updateOrderHerdset } from "./actions";

type Props = {
  orderId: string;
  initialNote: string | null;
  initialIsHerdset: boolean;
  herdsetLabel: string | null;
  isShipped: boolean;
};

export function OrderEditPanel({ orderId, initialNote, initialIsHerdset, herdsetLabel, isShipped }: Props) {
  const [note, setNote] = useState(initialNote ?? "");
  const [noteSaved, setNoteSaved] = useState(false);
  const [isSavingNote, startNoteTransition] = useTransition();

  const [isHerdset, setIsHerdset] = useState(initialIsHerdset);
  const [isTogglingHerdset, startHerdsetTransition] = useTransition();

  function saveNote() {
    startNoteTransition(async () => {
      await updateOrderNote(orderId, note);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    });
  }

  function toggleHerdset(checked: boolean) {
    setIsHerdset(checked);
    startHerdsetTransition(async () => {
      await updateOrderHerdset(orderId, checked);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Herdset */}
      <div className="flex flex-col gap-3">
        <div className="mb-0 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Herdset</div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={isHerdset}
            onChange={(e) => toggleHerdset(e.target.checked)}
            disabled={isTogglingHerdset || !isShipped}
            className="mt-0.5 h-4 w-4 accent-brand-red disabled:opacity-50"
          />
          <span className="font-mono text-xs text-grey-dark">
            {isHerdset
              ? `Herdset-Verkauf (${herdsetLabel ?? "kein Label"})`
              : "Kein Herdset-Verkauf"}
          </span>
        </label>
        {!isShipped && (
          <p className="font-mono text-[10px] text-grey-mid">Nur bei versendeten Bestellungen editierbar.</p>
        )}
        {isTogglingHerdset && (
          <p className="font-mono text-[10px] text-grey-mid">Wird gespeichert…</p>
        )}
      </div>

      {/* Notiz */}
      <div className="flex flex-col gap-2">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Notiz</div>
        <textarea
          value={note}
          onChange={(e) => { setNote(e.target.value); setNoteSaved(false); }}
          placeholder="z.B. Telefonnummer, Rückruf, Sonderabsprache…"
          rows={3}
          className="w-full resize-none rounded-lg border border-grey-border bg-white px-3 py-2 font-mono text-xs text-grey-dark placeholder-grey-mid/60 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
        />
        <button
          type="button"
          onClick={saveNote}
          disabled={isSavingNote}
          className="self-end rounded-lg bg-brand-red px-3 py-1.5 font-mono text-xs font-semibold text-white hover:bg-brand-red-dark disabled:opacity-50 transition-colors"
        >
          {noteSaved ? "✓ Gespeichert" : isSavingNote ? "Speichern…" : "Speichern"}
        </button>
      </div>
    </div>
  );
}
