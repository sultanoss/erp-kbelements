import Link from "next/link";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AngebotListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const { q, from, to } = await searchParams;

  const offers = await prisma.invoice.findMany({
    where: {
      docType: "angebot",
      ...(q && { customerName: { contains: q, mode: "insensitive" } }),
      ...((from || to) && {
        date: {
          ...(from && { gte: new Date(from + "T00:00:00") }),
          ...(to && { lte: new Date(to + "T23:59:59.999") }),
        },
      }),
    },
    orderBy: { date: "desc" },
    include: { items: true },
  });

  const hasFilter = !!(q || from || to);

  return (
    <AppShell>
      <PageHeader title="Angebote" eyebrow="Buchhaltung" />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <form method="GET" action="/angebot" className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Kundenname</label>
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Name suchen…"
              className="h-9 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10 w-48"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Von</label>
            <input type="date" name="from" defaultValue={from ?? ""}
              className="h-9 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Bis</label>
            <input type="date" name="to" defaultValue={to ?? ""}
              className="h-9 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10" />
          </div>
          <button type="submit"
            className="h-9 rounded-lg bg-brand-red px-4 font-mono text-sm font-semibold text-white hover:bg-brand-red-dark transition-colors">
            Suchen
          </button>
          {hasFilter && (
            <Link href="/angebot"
              className="h-9 inline-flex items-center rounded-lg border border-grey-border bg-white px-4 font-mono text-sm font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors">
              × Filter löschen
            </Link>
          )}
        </form>
        <Link href="/angebot/neu"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-red px-4 font-mono text-sm font-semibold text-white hover:bg-brand-red-dark transition-colors">
          + Neues Angebot
        </Link>
      </div>

      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-grey-border bg-grey-light">
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Angebots-Nr.</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Datum</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Kunde</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid text-right">Betrag</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-border">
            {offers.map((offer) => {
              const brutto =
                offer.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0) +
                (offer.shippingCost ?? 0);
              return (
                <tr key={offer.id} className="transition-colors hover:bg-grey-light/60">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-brand-red">{offer.number}</td>
                  <td className="px-4 py-3 font-mono text-xs text-grey-mid">{formatDate(offer.date)}</td>
                  <td className="px-4 py-3 text-sm text-grey-dark">{offer.customerName}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-sm text-grey-dark text-right">{brutto.toFixed(2)} €</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Link href={`/angebot/${offer.id}`}
                        className="rounded border border-grey-border px-2 py-1 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors">
                        Ansehen
                      </Link>
                      <Link href={`/angebot/${offer.id}/drucken`} target="_blank"
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
        {offers.length === 0 && (
          <div className="p-8 text-center font-mono text-xs text-grey-mid">
            {hasFilter ? "Keine Angebote gefunden." : "Noch keine Angebote erstellt."}
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
