"use client";

import { useActionState, useState } from "react";
import { undoMonthSales } from "@/app/actions";

const MONTH_NAMES = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

const initial = { done: false, count: 0, month: "" };

export function UndoMonth() {
  const [state, action, pending] = useActionState(undoMonthSales, initial);
  const [confirm, setConfirm] = useState(false);

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  function monthLabel(m: string) {
    if (!m) return "";
    const [y, mo] = m.split("-");
    return `${MONTH_NAMES[parseInt(mo) - 1]} ${y}`;
  }

  if (state.done) {
    return (
      <div className="rounded-lg border border-grey-border bg-grey-light px-4 py-3 font-mono text-sm text-grey-dark">
        ✓ {state.count} Verkäufe für {monthLabel(state.month)} rückgängig gemacht, Bestand wiederhergestellt.
      </div>
    );
  }

  if (confirm) {
    return (
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="month" value={defaultMonth} />
        <span className="font-mono text-sm text-grey-dark">
          Alle Verkäufe für <strong>{monthLabel(defaultMonth)}</strong> wirklich löschen?
        </span>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-50"
        >
          {pending ? "Wird gelöscht…" : "Ja, löschen"}
        </button>
        <button
          type="button"
          onClick={() => setConfirm(false)}
          className="rounded-lg border border-grey-border px-4 py-2 text-sm font-semibold text-grey-dark hover:bg-grey-light"
        >
          Abbrechen
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-mono text-xs text-grey-mid">
        Alle Verkäufe eines Monats löschen und Bestand wiederherstellen:
      </span>
      <span className="font-mono text-sm font-semibold text-grey-dark">{monthLabel(defaultMonth)}</span>
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="rounded-lg border border-brand-red/30 px-3 py-1.5 font-mono text-xs font-semibold text-brand-red hover:bg-brand-red/5"
      >
        Monat rückgängig machen
      </button>
    </div>
  );
}
