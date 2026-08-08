import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { auth } from "@/auth";
import { StornoButton } from "@/components/storno-button";
import { MarkAsBezahltButton } from "@/components/mark-as-bezahlt-button";
import { ConvertProformaButton } from "@/components/convert-proforma-button";
import { DeleteProformaButton } from "@/components/delete-proforma-button";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [inv, session] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { pos: "asc" }, include: { skus: true } }, user: true },
    }),
    auth(),
  ]);
  if (!inv) notFound();

  const isAdmin = session?.user?.role === "ADMIN";

  // Gewinnermittlung: nur für Admins bei B2B-Kunden
  let isB2B = false;
  let purchasePriceMap: Record<string, number | null> = {};
  if (isAdmin) {
    const b2bMatch = await prisma.b2bCustomer.findFirst({ where: { name: inv.customerName } });
    isB2B = !!b2bMatch;
    if (isB2B) {
      const allSkus = inv.items.flatMap((it) => it.skus.map((s) => s.sku)).filter(Boolean);
      const itemsWithPrice = await prisma.item.findMany({
        where: { sku: { in: allSkus } },
        select: { sku: true, purchasePrice: true },
      });
      purchasePriceMap = Object.fromEntries(itemsWithPrice.map((i) => [i.sku, i.purchasePrice ?? null]));
    }
  }

  const bruttoPositionen = inv.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const shipping = inv.shippingCost ?? 0;
  const bruttoGesamt = bruttoPositionen + shipping;
  const netto = inv.mwstRate > 0 ? bruttoGesamt / (1 + inv.mwstRate / 100) : bruttoGesamt;
  const mwst = bruttoGesamt - netto;


  return (
    <AppShell>
      <PageHeader title={inv.number} eyebrow={inv.docType === "proforma" ? "Proforma-Rechnung" : "Rechnung"} />

      {inv.docType === "proforma" && inv.status === "aktiv" && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <span className="rounded bg-blue-600 px-2 py-0.5 font-mono text-xs font-bold text-white">PROFORMA</span>
          <span className="font-mono text-sm text-blue-700">Kein Lagerbestand abgebucht — noch keine echte Rechnung</span>
        </div>
      )}

      {inv.status === "storniert" && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-brand-red/30 bg-brand-red/5 px-4 py-3">
          <span className="rounded bg-brand-red px-2 py-0.5 font-mono text-xs font-bold text-white">STORNIERT</span>
          <span className="font-mono text-sm text-grey-mid">
            {inv.storniertAt ? formatDate(inv.storniertAt) : ""}
          </span>
        </div>
      )}

      {!inv.bezahlt && inv.status === "aktiv" && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded bg-orange-500 px-2 py-0.5 font-mono text-xs font-bold text-white">UNBEZAHLT</span>
            <span className="font-mono text-sm text-orange-700">Zahlung steht noch aus</span>
          </div>
          <MarkAsBezahltButton invoiceId={id} />
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
        <a href={`/api/invoice/${id}/pdf`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-white px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors">
          PDF herunterladen
        </a>
        <Link href={`/buchhaltung/${id}/lieferschein`} target="_blank"
          className="inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-white px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors">
          Lieferschein
        </Link>
{inv.status === "aktiv" && inv.docType === "proforma" && (
          <>
            <ConvertProformaButton invoiceId={id} />
            <Link href={`/buchhaltung/${id}/bearbeiten`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-white px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors">
              Bearbeiten
            </Link>
            <DeleteProformaButton invoiceId={id} />
          </>
        )}
        {inv.status === "aktiv" && inv.docType !== "proforma" && (
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

      {isAdmin && isB2B && (() => {
        const rows = inv.items.map((it) => {
          const erlos = it.quantity * it.unitPrice;
          const ekKosten = it.skus.reduce((sum, s) => sum + it.quantity * (purchasePriceMap[s.sku] ?? 0), 0);
          return { ...it, erlos, ekKosten, gewinn: erlos - ekKosten };
        });
        const totalErlos = rows.reduce((s, r) => s + r.erlos, 0);
        const totalEK = rows.reduce((s, r) => s + r.ekKosten, 0);
        const totalGewinn = totalErlos - totalEK;
        const marge = totalErlos > 0 ? (totalGewinn / totalErlos) * 100 : 0;
        return (
          <div className="print:hidden mt-5 rounded-xl border border-orange-200 bg-orange-50 p-5">
            <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-orange-700">
              Gewinnermittlung — nur für Admins
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-orange-200">
                  <th className="pb-2 font-mono text-[10px] text-orange-600">Position</th>
                  <th className="pb-2 font-mono text-[10px] text-orange-600 text-right">Erlös</th>
                  <th className="pb-2 font-mono text-[10px] text-orange-600 text-right">EK-Kosten</th>
                  <th className="pb-2 font-mono text-[10px] text-orange-600 text-right">Gewinn</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-orange-100">
                    <td className="py-1.5 text-grey-dark">{r.description}</td>
                    <td className="py-1.5 font-mono tabular-nums text-right text-grey-dark">{r.erlos.toFixed(2)} €</td>
                    <td className="py-1.5 font-mono tabular-nums text-right text-grey-mid">{r.ekKosten.toFixed(2)} €</td>
                    <td className={`py-1.5 font-mono tabular-nums text-right font-semibold ${r.gewinn >= 0 ? "text-green-700" : "text-brand-red"}`}>
                      {r.gewinn.toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex justify-end gap-8 border-t border-orange-200 pt-3 font-mono text-sm font-semibold">
              <span className="text-grey-mid">Marge: <span className="text-orange-700">{marge.toFixed(1)} %</span></span>
              <span className="text-grey-mid">Gesamt-Gewinn: <span className={totalGewinn >= 0 ? "text-green-700" : "text-brand-red"}>{totalGewinn.toFixed(2)} €</span></span>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}
