"use client";

import { useTransition, useState } from "react";
import { createSalesFromTodaysShipments } from "@/app/actions";

export function TagesversandButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ created: number } | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const res = await createSalesFromTodaysShipments();
      setResult(res);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2.5 font-mono text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-50 transition-colors"
      >
        {isPending ? "Wird verarbeitet…" : "Versand heute fertig"}
      </button>
      {result !== null && (
        <span className="font-mono text-sm font-semibold text-green-700">
          {result.created > 0
            ? `✓ ${result.created} Verkauf${result.created === 1 ? "" : "e"} eingetragen`
            : "Keine neuen Versandvorgänge"}
        </span>
      )}
    </div>
  );
}
