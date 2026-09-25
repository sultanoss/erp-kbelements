"use client";

import { useTransition, useState } from "react";
import { markAsPickedUp, deleteDeliveryNote } from "./actions";

export function MarkAsPickedUpButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await markAsPickedUp(id);
        setConfirm(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Fehler");
        setConfirm(false);
      }
    });
  }

  if (confirm) {
    return (
      <span className="flex items-center gap-2">
        <button
          onClick={handleConfirm}
          disabled={pending}
          className="rounded border border-green-600 bg-green-600 px-2 py-1 font-mono text-[11px] font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {pending ? "…" : "Ja, abgeholt"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="rounded border border-grey-border px-2 py-1 font-mono text-[11px] text-grey-mid hover:text-grey-dark transition-colors"
        >
          Abbrechen
        </button>
        {error && <span className="font-mono text-[11px] text-brand-red">{error}</span>}
      </span>
    );
  }

  return (
    <span>
      <button
        onClick={() => setConfirm(true)}
        className="rounded border border-green-600 px-2 py-1 font-mono text-[11px] font-semibold text-green-700 hover:bg-green-50 transition-colors"
      >
        Abgeholt markieren
      </button>
      {error && <span className="ml-2 font-mono text-[11px] text-brand-red">{error}</span>}
    </span>
  );
}

export function DeleteDeliveryNoteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      await deleteDeliveryNote(id);
    });
  }

  if (confirm) {
    return (
      <span className="flex items-center gap-2">
        <button
          onClick={handleConfirm}
          disabled={pending}
          className="rounded border border-brand-red bg-brand-red px-2 py-1 font-mono text-[11px] font-semibold text-white hover:bg-brand-red-dark disabled:opacity-50 transition-colors"
        >
          {pending ? "…" : "Löschen"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="rounded border border-grey-border px-2 py-1 font-mono text-[11px] text-grey-mid transition-colors"
        >
          Abbrechen
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="rounded border border-grey-border px-2 py-1 font-mono text-[11px] text-grey-mid hover:border-brand-red hover:text-brand-red transition-colors"
    >
      Löschen
    </button>
  );
}

export function ScanUploadButton({ id, hasScan }: { id: string; hasScan: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("scan", file);
    startTransition(async () => {
      const { uploadScan } = await import("./actions");
      try {
        await uploadScan(id, fd);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
      }
    });
  }

  return (
    <span className="flex items-center gap-2">
      <label className="cursor-pointer rounded border border-grey-border px-2 py-1 font-mono text-[11px] text-grey-mid hover:border-brand-red hover:text-brand-red transition-colors">
        {pending ? "…" : hasScan ? "Scan ersetzen" : "Scan hochladen"}
        <input type="file" accept="image/*,application/pdf" onChange={handleChange} className="hidden" />
      </label>
      {hasScan && (
        <a
          href={`/api/ait/delivery-notes/${id}/scan`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-blue-200 px-2 py-1 font-mono text-[11px] text-blue-600 hover:bg-blue-50 transition-colors"
        >
          Scan anzeigen
        </a>
      )}
      {error && <span className="font-mono text-[11px] text-brand-red">{error}</span>}
    </span>
  );
}
