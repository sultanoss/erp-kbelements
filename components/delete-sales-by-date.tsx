"use client";

import { useActionState } from "react";
import { deleteSalesByDate } from "@/app/actions";

const initial = { done: false, count: 0, error: undefined as string | undefined };

export function DeleteSalesByDate() {
  const [state, action, pending] = useActionState(deleteSalesByDate, initial);

  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Datum</label>
          <input
            type="date"
            name="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
            className="h-9 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
          />
        </div>
        <button
          type="submit"
          disabled={pending || state.done}
          className="h-9 rounded-lg bg-brand-red px-4 font-mono text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-50 transition-colors"
        >
          {pending ? "Wird gelöscht…" : "Verkäufe löschen"}
        </button>
      </form>

      {state.done && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 font-mono text-sm text-green-700">
          ✓ {state.count} Verkauf{state.count !== 1 ? "e" : ""} gelöscht, Bestand wiederhergestellt.
        </div>
      )}
      {state.error && (
        <div className="rounded-lg border border-brand-red/20 bg-brand-red/5 px-4 py-3 font-mono text-sm text-brand-red">
          {state.error}
        </div>
      )}
    </div>
  );
}
