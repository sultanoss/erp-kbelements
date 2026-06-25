"use client";

import { useActionState } from "react";
import { importStock } from "@/app/actions";

const initial = { ok: false, imported: 0, errors: [] as string[] };

export function StockImport() {
  const [state, action, pending] = useActionState(importStock, initial);

  return (
    <div className="space-y-4">
      <form action={action} className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1.5 md:col-span-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
            Excel-Datei (SKU | Bestand)
          </span>
          <input
            name="file"
            type="file"
            accept=".xlsx,.xls"
            required
            className="h-10 rounded-lg border border-grey-border bg-white px-3 py-2 text-sm text-grey-dark file:mr-3 file:rounded file:border-0 file:bg-grey-light file:px-2 file:py-1 file:text-xs file:font-semibold file:text-grey-dark transition-colors focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={pending}
            className="h-10 flex-1 rounded-lg bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-brand-red-dark disabled:opacity-50"
          >
            {pending ? "Wird importiert…" : "Bestand setzen"}
          </button>
          <a
            href="/api/template?type=stock"
            className="flex h-10 items-center rounded-lg border border-grey-border bg-white px-3 text-xs font-semibold text-grey-dark hover:bg-grey-light"
          >
            Vorlage
          </a>
        </div>
      </form>

      {state.ok && state.imported > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 font-mono text-sm text-green-700">
          ✓ {state.imported} Artikel aktualisiert.
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
