import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { StornoButton } from "@/components/storno-button";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { pos: "asc" }, include: { skus: true } }, user: true },
  });
  if (!inv) notFound();

  const bruttoPositionen = inv.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const shipping = inv.shippingCost ?? 0;
  const bruttoGesamt = bruttoPositionen + shipping;
  const netto = inv.mwstRate > 0 ? bruttoGesamt / (1 + inv.mwstRate / 100) : bruttoGesamt;
  const mwst = bruttoGesamt - netto;


  return (
    <AppShell>
      <PageHeader title={inv.number} eyebrow="Rechnung" />

      {inv.status === "storniert" && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-brand-red/30 bg-brand-red/5 px-4 py-3">
          <span className="rounded bg-brand-red px-2 py-0.5 font-mono text-xs font-bold text-white">STORNIERT</span>
          <span className="font-mono text-sm text-grey-mid">
            {inv.storniertAt ? formatDate(inv.storniertAt) : ""}
          </span>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/buchhaltung"
          className="inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-grey-light px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:bg-grey-border transition-colors">
          ← Alle Rechnungen
        </Link>
        <Link href={`/buchhaltung/${id}/drucken`} target="_blank"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-red px-3 py-1.5 font-mono text-xs font-semibold text-white hover:bg-brand-red-dark transition-colors">
          Drucken / PDF
        </Link>
        <Link href={`/buchhaltung/${id}/lieferschein`} target="_blank"
          className="inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-white px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors">
          Lieferschein
        </Link>
{inv.status === "aktiv" && (
          <>
            <Link href={`/buchhaltung/${id}/bearbeiten`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-white px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors">
              Bearbeiten
            </Link>
            <Link href={`/buchhaltung/${id}/gutschrift`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-white px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors">
              Gutschrift erstellen
            </Link>
            <StornoButton invoiceId={id} />
          </>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel className="p-5">
          <div className="mb-3 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Rechnungsdetails</div>
          <dl className="space-y-2 font-mono text-sm">
            <div className="flex justify-between"><dt className="text-grey-mid">Rechnungs-Nr.</dt><dd className="font-semibold text-brand-red">{inv.number}</dd></div>
            <div className="flex justify-between"><dt className="text-grey-mid">Datum</dt><dd>{formatDate(inv.date)}</dd></div>
            <div className="flex justify-between"><dt className="text-grey-mid">MwSt.</dt><dd>{inv.mwstRate} %</dd></div>
            <div className="flex justify-between"><dt className="text-grey-mid">Bezahlart</dt><dd>{inv.paymentMethod === "bar" ? "Bar" : "Banküberweisung"}</dd></div>
            <div className="flex justify-between"><dt className="text-grey-mid">Erstellt von</dt><dd>{inv.user.name}</dd></div>
          </dl>
        </Panel>
        <Panel className="p-5">
          <div className="mb-3 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Kunde</div>
          <p className="font-semibold text-grey-dark">{inv.customerName}</p>
          {inv.customerNum && <p className="font-mono text-xs text-grey-mid">Kunden-Nr: {inv.customerNum}</p>}
          {inv.customerAddress && <p className="mt-1 whitespace-pre-line text-sm text-grey-mid">{inv.customerAddress}</p>}
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
            {inv.items.map((it) => (
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
              <span>Gesamt Netto ({inv.mwstRate} %)</span>
              <span className="tabular-nums">{netto.toFixed(2)} €</span>
            </div>
            {inv.mwstRate > 0 && (
              <div className="flex justify-between font-mono text-sm text-grey-mid">
                <span>zzgl. MwSt ({inv.mwstRate} %)</span>
                <span className="tabular-nums">{mwst.toFixed(2)} €</span>
              </div>
            )}
            {shipping > 0 && (
              <div className="flex justify-between font-mono text-sm text-grey-mid">
                <span>Transportkosten</span>
                <span className="tabular-nums">{shipping.toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between border-t border-grey-border pt-2 font-mono text-sm font-bold text-grey-dark">
              <span>Rechnungsbetrag</span>
              <span className="tabular-nums">{bruttoGesamt.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </Panel>

      {(inv.notes || inv.paymentInfo) && (
        <Panel className="mt-5 p-5 space-y-3">
          {inv.notes && (
            <div>
              <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Notiz</div>
              <p className="text-sm text-grey-dark whitespace-pre-line">{inv.notes}</p>
            </div>
          )}
          {inv.paymentMethod === "bar" ? (
            <div>
              <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Zahlungsinfo</div>
              <p className="text-sm text-grey-dark">Bezahlt: Bar</p>
            </div>
          ) : inv.paymentInfo && (
            <div>
              <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Zahlungsinfo</div>
              <p className="text-sm text-grey-dark">{inv.paymentInfo}</p>
            </div>
          )}
        </Panel>
      )}
    </AppShell>
  );
}
