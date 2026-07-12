import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GutschriftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gs = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { pos: "asc" }, include: { skus: true } }, user: true },
  });
  if (!gs || gs.docType !== "gutschrift") notFound();

  const bruttoPositionen = gs.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const shipping = gs.shippingCost ?? 0;
  const bruttoGesamt = bruttoPositionen + shipping;
  const shippingMwst = gs.shippingMwst ?? 19;
  const productNetto = gs.mwstRate > 0 ? bruttoPositionen / (1 + gs.mwstRate / 100) : bruttoPositionen;
  const productMwstAmt = bruttoPositionen - productNetto;
  const shippingNetto = shipping > 0 && shippingMwst > 0 ? shipping / (1 + shippingMwst / 100) : shipping;

  return (
    <AppShell>
      <PageHeader title={gs.number} eyebrow="Gutschrift" />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/gutschrift"
          className="inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-grey-light px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:bg-grey-border transition-colors">
          ← Alle Gutschriften
        </Link>
        <Link href={`/gutschrift/${id}/drucken`} target="_blank"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-red px-3 py-1.5 font-mono text-xs font-semibold text-white hover:bg-brand-red-dark transition-colors">
          Drucken / PDF
        </Link>
      </div>

      {gs.originalInvoiceId && gs.originalInvoiceNum && (
        <div className="mb-4 rounded-lg border border-grey-border bg-grey-light px-4 py-3 font-mono text-sm text-grey-mid">
          Bezug auf Rechnung:{" "}
          <Link href={`/buchhaltung/${gs.originalInvoiceId}`} className="font-semibold text-brand-red hover:underline">
            {gs.originalInvoiceNum}
          </Link>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Panel className="p-5">
          <div className="mb-3 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Gutschriftdetails</div>
          <dl className="space-y-2 font-mono text-sm">
            <div className="flex justify-between"><dt className="text-grey-mid">GS-Nr.</dt><dd className="font-semibold text-brand-red">{gs.number}</dd></div>
            <div className="flex justify-between"><dt className="text-grey-mid">Datum</dt><dd>{formatDate(gs.date)}</dd></div>
            <div className="flex justify-between"><dt className="text-grey-mid">MwSt.</dt><dd>{gs.mwstRate} %</dd></div>
            <div className="flex justify-between"><dt className="text-grey-mid">Erstellt von</dt><dd>{gs.user.name}</dd></div>
          </dl>
        </Panel>
        <Panel className="p-5">
          <div className="mb-3 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Kunde</div>
          <p className="font-semibold text-grey-dark">{gs.customerName}</p>
          {gs.customerNum && <p className="font-mono text-xs text-grey-mid">Kunden-Nr: {gs.customerNum}</p>}
          {gs.customerAddress && <p className="mt-1 whitespace-pre-line text-sm text-grey-mid">{gs.customerAddress}</p>}
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
            {gs.items.map((it) => (
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
              <span>Netto Produkte ({gs.mwstRate} %)</span>
              <span className="tabular-nums">{productNetto.toFixed(2)} €</span>
            </div>
            {gs.mwstRate > 0 && (
              <div className="flex justify-between font-mono text-sm text-grey-mid">
                <span>zzgl. MwSt ({gs.mwstRate} %)</span>
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
              <span>Gutschriftsbetrag</span>
              <span className="tabular-nums">{bruttoGesamt.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </Panel>

      {gs.notes && (
        <Panel className="mt-5 p-5">
          <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Notiz</div>
          <p className="text-sm text-grey-dark whitespace-pre-line">{gs.notes}</p>
        </Panel>
      )}
    </AppShell>
  );
}
