import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { PurchaseForm } from "./purchase-form";
import { requireAdmin } from "@/lib/auth-guards";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WareneinkaufPage({
  searchParams,
}: {
  searchParams: Promise<{ sku?: string; from?: string; to?: string }>;
}) {
  await requireAdmin();
  const { sku, from, to } = await searchParams;
  const hasFilter = !!(sku || from || to);

  const [items, history, suppliers] = await Promise.all([
    prisma.item.findMany({
      select: { sku: true, name: true, stock: true, purchasePrice: true },
      orderBy: { sku: "asc" },
    }),
    prisma.purchasePriceHistory.findMany({
      where: {
        ...(sku && { sku: { contains: sku, mode: "insensitive" } }),
        ...((from || to) && {
          date: {
            ...(from && { gte: new Date(from + "T00:00:00") }),
            ...(to && { lte: new Date(to + "T23:59:59.999") }),
          },
        }),
      },
      take: 200,
      orderBy: { createdAt: "desc" },
      include: { item: { select: { name: true } } },
    }),
    prisma.purchaseOrder.findMany({
      distinct: ["supplier"],
      select: { supplier: true },
      orderBy: { supplier: "asc" },
    }),
  ]);

  const orderIds = [...new Set(history.map((h) => h.purchaseOrderId))];
  const [orders, orderItems] = await Promise.all([
    orderIds.length > 0
      ? prisma.purchaseOrder.findMany({
          where: { id: { in: orderIds } },
          orderBy: { date: "desc" },
          include: { user: { select: { name: true } } },
        })
      : Promise.resolve([]),
    orderIds.length > 0
      ? prisma.purchaseOrderItem.findMany({
          where: { purchaseOrderId: { in: orderIds } },
        })
      : Promise.resolve([]),
  ]);

  const orderMap = Object.fromEntries(orders.map((o) => [o.id, o]));
  const itemDetailMap = Object.fromEntries(
    orderItems.map((oi) => [`${oi.purchaseOrderId}|${oi.sku}`, oi])
  );

  const thClass = "px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid";
  const inputClass = "h-9 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10";

  return (
    <AppShell>
      <PageHeader title="Wareneinkauf" eyebrow="B2B — Lager &amp; Einkaufspreise werden automatisch aktualisiert" />

      <Panel className="mb-6 p-5">
        <div className="mb-5 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">
          Neuer Wareneinkauf
        </div>
        <PurchaseForm allItems={items} />
      </Panel>

      {/* Export */}
      <Panel className="mb-6 p-5">
        <div className="mb-4 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">
          Export — SKU-Liste nach Lieferant
        </div>
        <form method="GET" action="/api/export/einkauf" className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Lieferant</span>
            <select name="supplier" className={inputClass}>
              <option value="">Alle Lieferanten</option>
              {suppliers.map((s) => (
                <option key={s.supplier} value={s.supplier}>{s.supplier}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Von</span>
            <input name="from" type="date" className={inputClass} />
          </label>
          <label className="grid gap-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Bis</span>
            <input name="to" type="date" className={inputClass} />
          </label>
          <button type="submit" className="h-9 rounded-lg bg-brand-red px-4 font-mono text-sm font-semibold text-white hover:bg-brand-red/90 transition-colors">
            ↓ Excel exportieren
          </button>
        </form>
      </Panel>

      {/* History */}
      <Panel className="overflow-hidden">
        <div className="border-b border-grey-border px-5 py-4">
          <div className="mb-4 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">
            Einkaufshistorie
          </div>

          {/* Filter */}
          <form method="GET" action="/b2b/einkauf" className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">SKU</label>
              <input
                type="text"
                name="sku"
                defaultValue={sku ?? ""}
                placeholder="z.B. TV-001"
                className={inputClass + " w-36"}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Von</label>
              <input type="date" name="from" defaultValue={from ?? ""} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Bis</label>
              <input type="date" name="to" defaultValue={to ?? ""} className={inputClass} />
            </div>
            <button
              type="submit"
              className="h-9 rounded-lg bg-brand-red px-4 font-mono text-sm font-semibold text-white hover:bg-brand-red/90 transition-colors"
            >
              Suchen
            </button>
            {hasFilter && (
              <Link
                href="/b2b/einkauf"
                className="h-9 inline-flex items-center rounded-lg border border-grey-border bg-white px-4 font-mono text-sm font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors"
              >
                × Filter löschen
              </Link>
            )}
          </form>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-grey-mid">
            {hasFilter ? "Keine Einträge für diesen Filter." : "Noch kein Wareneinkauf vorhanden."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-grey-border bg-grey-light">
                  {["Datum", "Lieferant", "Rechnungsnr.", "SKU", "Artikelname", "Menge", "Preis/Stk. (€)", "Alter Ø-Preis", "Neuer Ø-Preis", "Benutzer"].map((h) => (
                    <th key={h} className={thClass}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-grey-border">
                {history.map((h) => {
                  const order = orderMap[h.purchaseOrderId];
                  const detail = itemDetailMap[`${h.purchaseOrderId}|${h.sku}`];
                  const oldAvg = detail?.oldPurchasePrice ?? null;
                  const oldStock = detail?.oldStock ?? 0;
                  const newAvg =
                    oldAvg != null && oldStock > 0
                      ? (oldStock * oldAvg + h.quantity * h.purchasePrice) / (oldStock + h.quantity)
                      : h.purchasePrice;
                  return (
                    <tr key={h.id} className="transition-colors hover:bg-grey-light/60">
                      <td className="px-4 py-3 font-mono text-xs text-grey-mid">{formatDate(h.date)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-grey-dark">{h.supplier}</td>
                      <td className="px-4 py-3 font-mono text-xs text-grey-mid">{h.invoiceNumber}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-red">{h.sku}</td>
                      <td className="px-4 py-3 text-xs text-grey-dark">{h.item.name}</td>
                      <td className="px-4 py-3 font-mono tabular-nums font-semibold text-green-700">+{h.quantity}</td>
                      <td className="px-4 py-3 font-mono tabular-nums text-grey-dark">{h.purchasePrice.toFixed(2)} €</td>
                      <td className="px-4 py-3 font-mono tabular-nums text-grey-mid">
                        {oldAvg != null ? `${oldAvg.toFixed(2)} €` : "–"}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums font-semibold text-grey-dark">
                        {newAvg.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-xs text-grey-mid">{order?.user.name ?? "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
