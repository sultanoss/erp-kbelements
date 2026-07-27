"use client";

import { useState, useTransition } from "react";
import { createDailySalesFromShipments, undoDailySales, type DailySalesResult } from "@/app/actions";

type State =
  | { phase: "idle" }
  | { phase: "nothingNew" }
  | { phase: "success"; result: DailySalesResult }
  | { phase: "undone" };

export function VersandFertigButton() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [isPending, startTransition] = useTransition();
  const [isUndoing, startUndoTransition] = useTransition();

  function handleVersandFertig() {
    startTransition(async () => {
      const res = await createDailySalesFromShipments();
      if (res.nothingNew) {
        setState({ phase: "nothingNew" });
      } else {
        setState({ phase: "success", result: res });
      }
    });
  }

  function handleUndo() {
    if (state.phase !== "success") return;
    const { saleIds, herdsetSaleIds, shipmentIds } = state.result;
    startUndoTransition(async () => {
      await undoDailySales({ saleIds, herdsetSaleIds, shipmentIds });
      setState({ phase: "undone" });
    });
  }

  if (state.phase === "undone") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-grey-border bg-white px-5 py-3 shadow-sm">
        <span className="font-mono text-sm text-grey-mid">Rückgängig gemacht — Versand fertig zurückgesetzt.</span>
        <button
          type="button"
          onClick={() => setState({ phase: "idle" })}
          className="font-mono text-xs text-grey-mid underline hover:text-brand-red"
        >
          Zurück
        </button>
      </div>
    );
  }

  if (state.phase === "success") {
    const { salesCreated, herdsetsCreated } = state.result;
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-3 shadow-sm">
        <svg className="h-5 w-5 flex-shrink-0 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="flex-1 font-mono text-sm font-semibold text-green-800">
          {salesCreated} Verkäufe{herdsetsCreated > 0 ? ` + ${herdsetsCreated} Herdset${herdsetsCreated > 1 ? "s" : ""}` : ""} eingetragen
        </span>
        <button
          type="button"
          onClick={handleUndo}
          disabled={isUndoing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-green-700 hover:border-green-500 transition-colors disabled:opacity-50"
        >
          {isUndoing ? "Wird rückgängig gemacht…" : "↩ Rückgängig"}
        </button>
      </div>
    );
  }

  if (state.phase === "nothingNew") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-grey-border bg-white px-5 py-3 shadow-sm">
        <span className="font-mono text-sm text-grey-mid">Keine neuen Versendungen seit dem letzten Abschluss.</span>
        <button
          type="button"
          onClick={() => setState({ phase: "idle" })}
          className="font-mono text-xs text-grey-mid underline hover:text-brand-red"
        >
          Zurück
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleVersandFertig}
      disabled={isPending}
      className="inline-flex items-center gap-2.5 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-60 shadow-sm"
    >
      {isPending ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          Wird verarbeitet…
        </>
      ) : (
        <>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Versand fertig
        </>
      )}
    </button>
  );
}
