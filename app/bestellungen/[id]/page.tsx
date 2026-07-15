import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { markAsOffen } from "./actions";
import { ShipDialog } from "./ship-dialog";
import { PrintLabelButton } from "./print-label-button";

export const dynamic = "force-dynamic";

export default async function BestellungDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, shipments: true },
  });

  if (!order) notFound();

  const total = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const isAbgeschlossen = order.status === "ABGESCHLOSSEN";

  return (
    <AppShell>
      <PageHeader
        title={order.orderNumber ? `Bestellung ${order.orderNumber}` : `Bestellung #${order.externalId.slice(-8).toUpperCase()}`}
        eyebrow={order.marketplace}
        backHref="/bestellungen"
        backLabel="Alle Bestellungen"
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Linke Spalte */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Artikel */}
          <Panel className="overflow-hidden">
            <div className="border-b border-grey-border px-5 py-3">
              <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Bestellpositionen</div>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-grey-border bg-grey-light">
                  <th className="px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Artikel</th>
                  <th className="px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid text-right">Menge</th>
                  <th className="px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid text-right">Preis</th>
                  <th className="px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid text-right">Gesamt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grey-border">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-grey-dark">{item.title}</div>
                      <div className="mt-0.5 font-mono text-xs text-grey-mid">
                        Marktplatz-SKU: {item.marketplaceSku}
                        {item.internalSku && ` · Intern: ${item.internalSku}`}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono tabular-nums text-sm text-grey-dark text-right">{item.quantity}×</td>
                    <td className="px-5 py-3 font-mono tabular-nums text-sm text-grey-dark text-right">{item.price.toFixed(2)} €</td>
                    <td className="px-5 py-3 font-mono tabular-nums text-sm font-bold text-grey-dark text-right">
                      {(item.price * item.quantity).toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-grey-border bg-grey-light">
                  <td colSpan={3} className="px-5 py-3 text-right font-semibold text-grey-dark">Gesamtbetrag</td>
                  <td className="px-5 py-3 font-mono tabular-nums text-sm font-black text-brand-red text-right">{total.toFixed(2)} €</td>
                </tr>
              </tfoot>
            </table>
          </Panel>

          {/* Versand-Panel */}
          <Panel className="overflow-hidden">
            <div className="border-b border-grey-border px-5 py-3">
              <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Versand</div>
            </div>

            {isAbgeschlossen ? (
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-green-200 bg-green-50 text-green-700">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-grey-dark">Bestellung abgeschlossen</div>
                    <div className="mt-0.5 font-mono text-xs text-grey-mid">
                      Abgeschlossen am {new Date(order.updatedAt).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}
                    </div>
                  </div>
                </div>
                <form action={markAsOffen}>
                  <input type="hidden" name="id" value={order.id} />
                  <button type="submit" className="rounded-lg border border-grey-border bg-white px-3 py-1.5 font-mono text-xs text-grey-mid hover:border-brand-red hover:text-brand-red transition-colors">
                    Wieder öffnen
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-5">
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <span className="mt-0.5 text-sm">📦</span>
                  <div>
                    <div className="font-mono text-[10px] font-bold text-amber-800">Bereit zum Versenden</div>
                    <div className="mt-0.5 font-mono text-[10px] text-amber-700">
                      Versandart und Artikel auswählen, dann Label erstellen.
                    </div>
                  </div>
                </div>
                <ShipDialog
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                  marketplace={order.marketplace}
                  orderItems={order.items.map((i) => ({ marketplaceSku: i.marketplaceSku, quantity: i.quantity }))}
                />
              </div>
            )}
          </Panel>
        </div>

        {/* Rechte Spalte */}
        <div className="flex flex-col gap-5">
          {/* Status */}
          <Panel className="p-5">
            <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Status</div>
            {isAbgeschlossen ? (
              <span className="inline-flex items-center rounded border border-green-200 bg-green-50 px-3 py-1 font-mono text-xs font-bold text-green-700">
                Abgeschlossen
              </span>
            ) : (
              <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-3 py-1 font-mono text-xs font-bold text-amber-700">
                Offen
              </span>
            )}
          </Panel>

          {/* Lieferadresse */}
          <Panel className="overflow-hidden">
            <div className="border-b border-grey-border px-5 py-3">
              <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Lieferadresse</div>
            </div>
            <div className="space-y-1 p-5 font-mono text-sm text-grey-dark">
              <div className="font-bold">{order.customerName}</div>
              <div>{order.street}</div>
              <div>{order.zip} {order.city}</div>
              <div className="text-grey-mid">{order.country}</div>
              {order.phoneNumber && (
                <div className="text-grey-mid">{order.phoneNumber}</div>
              )}
            </div>
          </Panel>

          {/* Rechnungsanschrift */}
          <Panel className="overflow-hidden">
            <div className="border-b border-grey-border px-5 py-3">
              <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Rechnungsanschrift</div>
            </div>
            <div className="space-y-1 p-5 font-mono text-sm text-grey-dark">
              {!order.billingName && (
                <div className="mb-2 font-mono text-[10px] text-grey-mid/70 italic">Keine separate Rechnungsadresse — Lieferadresse wird verwendet</div>
              )}
              <div className="font-bold">{order.billingName ?? order.customerName}</div>
              <div>{order.billingStreet ?? order.street}</div>
              <div>{order.billingZip ?? order.zip} {order.billingCity ?? order.city}</div>
              <div className="text-grey-mid">{order.billingCountry ?? order.country}</div>
            </div>
          </Panel>

          {/* Details */}
          <Panel className="overflow-hidden">
            <div className="border-b border-grey-border px-5 py-3">
              <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Details</div>
            </div>
            <dl className="divide-y divide-grey-border">
              <div className="flex justify-between px-5 py-3">
                <dt className="font-mono text-xs text-grey-mid">Marktplatz</dt>
                <dd className="font-mono text-xs font-bold text-brand-red">{order.marketplace}</dd>
              </div>
              {order.orderNumber && (
                <div className="flex justify-between px-5 py-3">
                  <dt className="font-mono text-xs text-grey-mid">Otto-Bestellnr.</dt>
                  <dd className="font-mono text-xs font-bold text-grey-dark">{order.orderNumber}</dd>
                </div>
              )}
              <div className="flex justify-between px-5 py-3">
                <dt className="font-mono text-xs text-grey-mid">Bestelldatum</dt>
                <dd className="font-mono text-xs text-grey-dark">{new Date(order.orderDate).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}</dd>
              </div>
              <div className="flex justify-between px-5 py-3">
                <dt className="font-mono text-[10px] text-grey-mid/70">Externe ID</dt>
                <dd className="font-mono text-[10px] text-grey-mid break-all max-w-[140px] text-right">{order.externalId}</dd>
              </div>
              <div className="flex justify-between px-5 py-3">
                <dt className="font-mono text-xs text-grey-mid">Importiert</dt>
                <dd className="font-mono text-xs text-grey-dark">{new Date(order.createdAt).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}</dd>
              </div>
              {order.trackingNumber && (
                <div className="flex justify-between px-5 py-3">
                  <dt className="font-mono text-xs text-grey-mid">Tracking</dt>
                  <dd className="font-mono text-xs font-bold text-grey-dark">{order.trackingNumber}</dd>
                </div>
              )}
              {order.marketplace === "OTTO" && order.shipments?.[0]?.returnTrackingNumber && (
                <div className="flex justify-between px-5 py-3">
                  <dt className="font-mono text-xs text-grey-mid">Retourennummer</dt>
                  <dd className="font-mono text-xs font-bold text-grey-dark">{order.shipments[0].returnTrackingNumber}</dd>
                </div>
              )}
            </dl>
            {order.shipments?.[0]?.labelUrl && (
              <PrintLabelButton url={order.shipments[0].labelUrl} />
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
