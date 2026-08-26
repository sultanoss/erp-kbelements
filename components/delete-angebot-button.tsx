"use client";

import { useTransition } from "react";
import { deleteAngebot } from "@/app/actions";

export function DeleteAngebotButton({ angebotId }: { angebotId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Angebot wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    startTransition(async () => {
      await deleteAngebot(angebotId);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-red/40 bg-brand-red/5 px-3 py-1.5 font-mono text-xs font-semibold text-brand-red hover:bg-brand-red/10 disabled:opacity-50 transition-colors"
    >
      {isPending ? "Wird gelöscht…" : "Löschen"}
    </button>
  );
}
