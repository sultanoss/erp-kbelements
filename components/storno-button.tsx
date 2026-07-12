"use client";

import { useTransition } from "react";
import { stornoInvoice } from "@/app/actions";

export function StornoButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Rechnung wirklich stornieren? Der Lagerbestand wird rückgebucht.")) return;
    startTransition(() => {
      stornoInvoice(invoiceId);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-red/40 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-brand-red hover:bg-brand-red hover:text-white disabled:opacity-50 transition-colors"
    >
      {isPending ? "Wird storniert…" : "Stornieren"}
    </button>
  );
}
