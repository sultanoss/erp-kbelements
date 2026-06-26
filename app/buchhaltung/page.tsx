import Link from "next/link";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BuchhaltungPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true, user: true },
  });

  return (
    <AppShell>
      <PageHeader title="Buchhaltung" eyebrow="Rechnungen" />

      <div className="mb-6 flex justify-end">
        <Link
          href="/buchhaltung/neu"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2.5 font-mono text-sm font-semibold text-white hover:bg-brand-red-dark transition-colors"
        >
          + Neue Rechnung
        </Link>
      </div>

      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-grey-border bg-grey-light">
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Rechnungs-Nr.</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Datum</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Kunde</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">MwSt.</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid text-right">Betrag</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-border">
            {invoices.map((inv) => {
              const netto = inv.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
              const brutto = netto * (1 + inv.mwstRate / 100);
              return (
                <tr key={inv.id} className="transition-colors hover:bg-grey-light/60">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-brand-red">{inv.number}</td>
                  <td className="px-4 py-3 font-mono text-xs text-grey-mid">{formatDate(inv.date)}</td>
                  <td className="px-4 py-3 text-sm text-grey-dark">{inv.customerName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-grey-mid">{inv.mwstRate} %</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-sm font-bold text-grey-dark text-right">{brutto.toFixed(2)} €</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/buchhaltung/${inv.id}`}
                        className="rounded border border-grey-border px-2 py-1 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors">
                        Ansehen
                      </Link>
                      <Link href={`/buchhaltung/${inv.id}/drucken`} target="_blank"
                        className="rounded border border-grey-border px-2 py-1 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors">
                        Drucken
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <div className="p-8 text-center font-mono text-xs text-grey-mid">Noch keine Rechnungen erstellt.</div>
        )}
      </Panel>
    </AppShell>
  );
}
