"use client";

import { useTransition } from "react";
import { deleteProforma } from "@/app/actions";

export function DeleteProformaButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Proforma-Rechnung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    startTransition(async () => {
      await deleteProforma(invoiceId);
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
