"use client";

import { useState } from "react";
import { createGutschrift } from "@/app/actions";

function fmt(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function GutschriftForm({
  originalInvoiceId,
  originalInvoiceNum,
  customerName,
  originalbetrag,
  today,
}: {
  originalInvoiceId: string;
  originalInvoiceNum: string;
  customerName: string;
  originalbetrag: number;
  today: string;
}) {
  const [betrag, setBetrag] = useState("");

  const betragNum = parseFloat(betrag.replace(",", ".")) || 0;
  const saldo = originalbetrag - betragNum;

  const action = createGutschrift.bind(null, originalInvoiceId);

  return (
    <form action={action} className="space-y-5">
      {/* Originalrechnung Info */}
      <div className="rounded-lg border border-grey-border bg-grey-light p-4">
        <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
          Originalrechnung
        </div>
        <div className="grid grid-cols-3 gap-4 font-mono text-sm">
          <div>
            <div className="mb-0.5 text-xs text-grey-mid">RE-Nr.</div>
            <div className="font-semibold text-brand-red">{originalInvoiceNum}</div>
          </div>
          <div>
            <div className="mb-0.5 text-xs text-grey-mid">Kunde</div>
            <div className="font-semibold text-grey-dark">{customerName}</div>
          </div>
          <div>
            <div className="mb-0.5 text-xs text-grey-mid">Originalbetrag</div>
            <div className="font-semibold text-grey-dark">{fmt(originalbetrag)} €</div>
          </div>
        </div>
      </div>

      {/* Felder */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
            Gutschriftbetrag (Brutto inkl. MwSt) *
          </label>
          <input
            type="text"
            name="betrag"
            value={betrag}
            onChange={(e) => setBetrag(e.target.value)}
            placeholder="0,00"
            required
            className="h-10 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
            Datum
          </label>
          <input
            type="date"
            name="datum"
            defaultValue={today}
            className="h-10 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
          Notiz (optional)
        </label>
        <textarea
          name="notiz"
          rows={2}
          className="rounded-lg border border-grey-border bg-white px-3 py-2 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
        />
      </div>

      {/* Live-Vorschau */}
      {betragNum > 0 && (
        <div className="ml-auto w-64 rounded-lg border border-grey-border bg-white p-4">
          <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
            Übersicht
          </div>
          <div className="space-y-1.5 font-mono text-sm">
            <div className="flex justify-between text-grey-mid">
              <span>Originalbetrag</span>
              <span className="tabular-nums">{fmt(originalbetrag)} €</span>
            </div>
            <div className="flex justify-between text-brand-red">
              <span>Gutschrift</span>
              <span className="tabular-nums">− {fmt(betragNum)} €</span>
            </div>
            <div className="flex justify-between border-t border-grey-border pt-2 font-semibold text-grey-dark">
              <span>Saldo</span>
              <span className="tabular-nums">{fmt(saldo)} €</span>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="h-10 rounded-lg bg-brand-red px-6 font-mono text-sm font-semibold text-white transition-colors hover:bg-brand-red-dark"
      >
        Gutschrift erstellen
      </button>
    </form>
  );
}
