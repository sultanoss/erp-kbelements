"use client";

import { useActionState } from "react";
import { deleteSalesByDate } from "@/app/actions";
import { useState } from "react";

const today = new Date().toISOString().slice(0, 10);

export function DeleteSales() {
  const [result, action, pending] = useActionState(deleteSalesByDate, null);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <form action={action} className="grid gap-4 md:grid-cols-4 items-end">
      <div className="grid gap-1.5">
        <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
          Datum
        </label>
        <input
          name="date"
          type="date"
          defaultValue={today}
          className="h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
        />
      </div>

      <div className="grid gap-1.5">
        <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
          Quelle
        </label>
        <select
          name="source"
          className="h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
        >
          <option value="TAGESVERKAUF">Tagesverkäufe</option>
          <option value="HAENDLER">Händler</option>
          <option value="LAGER">Lager</option>
          <option value="ALLE">Alle</option>
        </select>
      </div>

      <div className="grid gap-1.5">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="h-4 w-4 rounded accent-brand-red"
          />
          <span className="font-mono text-xs text-grey-dark">Ja, wirklich löschen</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={!confirmed || pending}
        className="h-10 rounded-lg bg-brand-red px-4 text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Wird gelöscht…" : "Löschen + Bestand wiederherstellen"}
      </button>

      {result?.done && (
        <p className="md:col-span-4 font-mono text-xs text-green-700">
          ✓ {result.count} {result.count === 1 ? "Eintrag" : "Einträge"} gelöscht, Bestand wiederhergestellt.
        </p>
      )}
      {result?.done === false && (
        <p className="md:col-span-4 font-mono text-xs text-brand-red">Kein Datum angegeben.</p>
      )}
    </form>
  );
}
