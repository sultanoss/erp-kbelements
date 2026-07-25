"use client";

import { useTransition } from "react";
import { markAsBezahlt } from "@/app/actions";

export function MarkAsBezahltButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => markAsBezahlt(invoiceId))}
      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 font-mono text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
    >
      {isPending ? "Wird gespeichert…" : "✓ Als bezahlt markieren"}
    </button>
  );
}
