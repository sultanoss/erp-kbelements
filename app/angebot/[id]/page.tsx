import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AngebotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const offer = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { pos: "asc" }, include: { skus: true } }, user: true },
  });
  if (!offer || offer.docType !== "angebot") notFound();

  const bruttoPositionen = offer.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const shipping = offer.shippingCost ?? 0;
  const bruttoGesamt = bruttoPositionen + shipping;
  const shippingMwst = offer.shippingMwst ?? 19;
  const productNetto = offer.mwstRate > 0 ? bruttoPositionen / (1 + offer.mwstRate / 100) : bruttoPositionen;
  const productMwstAmt = bruttoPositionen - productNetto;
  const shippingNetto = shipping > 0 && shippingMwst > 0 ? shipping / (1 + shippingMwst / 100) : shipping;

  return (
    <AppShell>
      <PageHeader title={offer.number} eyebrow="Angebot" />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/angebot"
          className="inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-grey-light px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:bg-grey-border transition-colors">
          ← Alle Angebote
        </Link>
        <Link href={`/angebot/${id}/drucken`} target="_blank"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-red px-3 py-1.5 font-mono text-xs font-semibold text-white hover:bg-brand-red-dark transition-colors">
          Drucken / PDF
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel className="p-5">
          <div className="mb-3 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Angebotsdetails</div>
          <dl className="space-y-2 font-mono text-sm">
            <div className="flex justify-between"><dt className="text-grey-mid">Angebots-Nr.</dt><dd className="font-semibold text-brand-red">{offer.number}</dd></div>
            <div className="flex justify-between"><dt className="text-grey-mid">Datum</dt><dd>{formatDate(offer.date)}</dd></div>
            <div className="flex justify-between"><dt className="text-grey-mid">MwSt.</dt><dd>{offer.mwstRate} %</dd></div>
            <div className="flex justify-between"><dt className="text-grey-mid">Erstellt von</dt><dd>{offer.user.name}</dd></div>
          </dl>
        </Panel>
        <Panel className="p-5">
          <div className="mb-3 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Kunde</div>
          <p className="font-semibold text-grey-dark">{offer.customerName}</p>
          {offer.customerNum && <p className="font-mono text-xs text-grey-mid">Kunden-Nr: {offer.customerNum}</p>}
          {offer.customerAddress && <p className="mt-1 whitespace-pre-line text-sm text-grey-mid">{offer.customerAddress}</p>}
        </Panel>
      </div>

      <Panel className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b border-grey-border bg-grey-light">
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Pos.</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Art.-Nr.</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Bezeichnung</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid text-right">Menge</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid text-right">E.-Preis</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid text-right">G.-Preis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-border">
            {offer.items.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-3 font-mono text-xs text-grey-mid">{it.pos}</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-red">
                  {it.skus.length > 0 ? it.skus.map((s) => s.sku).join(" + ") : "—"}
                </td>
                <td className="px-4 py-3 text-grey-dark">{it.description}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-right text-grey-dark">{it.quantity}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-right text-grey-dark">{it.unitPrice.toFixed(2)} €</td>
                <td className="px-4 py-3 font-mono tabular-nums text-right font-semibold text-grey-dark">{(it.quantity * it.unitPrice).toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end border-t border-grey-border p-5">
          <div className="w-64 space-y-1.5">
            <div className="flex justify-between font-mono text-sm text-grey-mid">
              <span>Netto Produkte ({offer.mwstRate} %)</span>
              <span className="tabular-nums">{productNetto.toFixed(2)} €</span>
            </div>
            {offer.mwstRate > 0 && (
              <div className="flex justify-between font-mono text-sm text-grey-mid">
                <span>zzgl. MwSt ({offer.mwstRate} %)</span>
                <span className="tabular-nums">{productMwstAmt.toFixed(2)} €</span>
              </div>
            )}
            {shipping > 0 && (
              <div className="flex justify-between font-mono text-sm text-grey-mid">
                <span>Versand ({shippingMwst} % MwSt)</span>
                <span className="tabular-nums">{shipping.toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between border-t border-grey-border pt-2 font-mono text-sm font-bold text-grey-dark">
              <span>Angebotsbetrag</span>
              <span className="tabular-nums">{bruttoGesamt.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </Panel>

      {offer.notes && (
        <Panel className="mt-5 p-5">
          <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Notiz</div>
          <p className="text-sm text-grey-dark whitespace-pre-line">{offer.notes}</p>
        </Panel>
      )}
    </AppShell>
  );
}
