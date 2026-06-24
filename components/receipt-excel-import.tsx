"use client";

import { useActionState } from "react";
import { importReceiptsExcel, undoReceiptImport } from "@/app/actions";
import { Field } from "@/components/ui";

const initialImport = { ok: false, imported: 0, errors: [] as string[], receiptIds: [] as string[] };
const initialUndo = { done: false, count: 0 };

export function ReceiptExcelImport() {
  const [state, action, pending] = useActionState(importReceiptsExcel, initialImport);
  const [undoState, undoAction, undoPending] = useActionState(undoReceiptImport, initialUndo);

  const showUndo = state.ok && state.receiptIds.length > 0 && !undoState.done;

  return (
    <div className="space-y-4">
      <form action={action} className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1.5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
            Excel- oder CSV-Datei
          </span>
          <input
            name="file"
            type="file"
            accept=".xlsx,.xls,.csv"
            required
            className="h-10 rounded-lg border border-grey-border bg-white px-3 py-2 text-sm text-grey-dark file:mr-3 file:rounded file:border-0 file:bg-grey-light file:px-2 file:py-1 file:text-xs file:font-semibold file:text-grey-dark transition-colors focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
          />
        </label>
        <Field label="Datum" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="h-10 w-full rounded-lg bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-brand-red-dark disabled:opacity-50"
          >
            {pending ? "Wird importiert…" : "Wareneingang importieren"}
          </button>
        </div>
      </form>

      {state.ok && state.imported > 0 && !undoState.done && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <span className="font-mono text-sm text-green-700">
            ✓ {state.imported} Wareneingang{state.imported !== 1 ? "s" : ""} importiert, Bestand erhöht.
          </span>
          {showUndo && (
            <form action={undoAction}>
              <input type="hidden" name="ids" value={state.receiptIds.join(",")} />
              <button
                type="submit"
                disabled={undoPending}
                className="rounded-lg border border-brand-red/30 px-3 py-1.5 font-mono text-xs font-semibold text-brand-red hover:bg-brand-red/5 disabled:opacity-50"
              >
                {undoPending ? "Wird rückgängig…" : "↩ Rückgängig machen"}
              </button>
            </form>
          )}
        </div>
      )}

      {undoState.done && (
        <div className="rounded-lg border border-grey-border bg-grey-light px-4 py-3 font-mono text-sm text-grey-dark">
          ✓ {undoState.count} Wareneingänge rückgängig gemacht, Bestand wiederhergestellt.
        </div>
      )}

      {state.errors.length > 0 && (
        <div className="rounded-lg border border-brand-red/20 bg-brand-red/5 px-4 py-3 font-mono text-sm text-brand-red">
          <div className="mb-1 font-semibold">{state.errors.length} Fehler:</div>
          <ul className="list-inside list-disc space-y-0.5">
            {state.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
