"use client";

import { useTransition } from "react";
import { convertProformaToRechnung } from "@/app/actions";

export function ConvertProformaButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Proforma-Rechnung in eine echte Rechnung umwandeln? Der Lagerbestand wird abgebucht.")) return;
    startTransition(async () => {
      await convertProformaToRechnung(invoiceId);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-red px-3 py-1.5 font-mono text-xs font-semibold text-white hover:bg-brand-red-dark disabled:opacity-50 transition-colors"
    >
      {isPending ? "Wird umgewandelt…" : "Zu Rechnung umwandeln"}
    </button>
  );
}
