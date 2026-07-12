import Link from "next/link";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function ExportPage({
  searchParams,
}: {
  searchParams?: Record<string, string>;
}) {
  const currentYear = new Date().getFullYear();
  const defaultFrom = `${currentYear}-01-01`;
  const defaultTo = `${currentYear}-12-31`;

  return (
    <AppShell>
      <PageHeader title="Export" eyebrow="Buchhaltung" />

      <div className="max-w-lg space-y-6">
        <Panel className="p-6">
          <div className="mb-5 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">
            CSV-Export für Steuerberater
          </div>
          <p className="mb-5 text-sm text-grey-mid">
            Exportiert alle Rechnungen, Stornierungen und Gutschriften als CSV-Datei.
            Semikolon-getrennt, UTF-8 — direkt in Excel öffenbar.
          </p>

          <form method="GET" action="/export/download" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                  Von
                </label>
                <input
                  type="date"
                  name="from"
                  defaultValue={defaultFrom}
                  required
                  className="h-9 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                  Bis
                </label>
                <input
                  type="date"
                  name="to"
                  defaultValue={defaultTo}
                  required
                  className="h-9 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                Belegart
              </label>
              <select
                name="type"
                defaultValue="all"
                className="h-9 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
              >
                <option value="all">Alle (Rechnungen + Storniert + Gutschriften)</option>
                <option value="rechnung">Nur Rechnungen</option>
                <option value="storniert">Nur Storniert</option>
                <option value="gutschrift">Nur Gutschriften</option>
              </select>
            </div>

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-red font-mono text-sm font-semibold text-white transition-colors hover:bg-brand-red-dark"
            >
              CSV herunterladen
            </button>
          </form>
        </Panel>

        <Panel className="p-5">
          <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
            Enthaltene Spalten
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-grey-border">
              {[
                ["Belegart", "Rechnung / Gutschrift / Storniert"],
                ["Belegnummer", "RE-202607-10001"],
                ["Datum", "12.07.2026"],
                ["Kundennummer", "KD-001"],
                ["Kundenname", "Mustermann GmbH"],
                ["Bruttobetrag", "119,00"],
                ["MwSt-Satz (%)", "19"],
                ["Nettobetrag", "100,00"],
                ["MwSt-Betrag", "19,00"],
                ["Status", "aktiv / storniert"],
              ].map(([col, example]) => (
                <tr key={col}>
                  <td className="py-1.5 pr-4 font-mono text-xs font-semibold text-grey-dark">{col}</td>
                  <td className="py-1.5 font-mono text-xs text-grey-mid">{example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </AppShell>
  );
}
