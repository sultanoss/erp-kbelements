import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  NEU: "Offen",
  ABGESCHLOSSEN: "Abgeschlossen",
};

const statusBadge: Record<string, string> = {
  NEU: "bg-amber-50 text-amber-700 border-amber-200",
  ABGESCHLOSSEN: "bg-green-50 text-green-700 border-green-200",
};

const inputClass = "h-9 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10";

export default async function BestellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; marketplace?: string; q?: string; datFrom?: string; datTo?: string }>;
}) {
  const { status, marketplace, q, datFrom, datTo } = await searchParams;

  // Convert Berlin date strings (YYYY-MM-DD) to UTC boundaries
  const dateFilter = datFrom || datTo ? {
    orderDate: {
      ...(datFrom ? { gte: new Date(datFrom + "T00:00:00+02:00") } : {}),
      ...(datTo   ? { lte: new Date(datTo   + "T23:59:59+02:00") } : {}),
    },
  } : {};

  const [orders, lastImport] = await Promise.all([
    prisma.order.findMany({
      take: 200,
      orderBy: { orderDate: "desc" },
      where: {
        ...(status ? { status } : {}),
        ...(marketplace ? { marketplace } : {}),
        ...(q ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
            { items: { some: { marketplaceSku: { contains: q, mode: "insensitive" } } } },
          ],
        } : {}),
        ...dateFilter,
      },
      include: { items: true },
    }),
    prisma.setting.findUnique({ where: { key: "lastOrderImport" } }),
  ]);

  const hasFilter = !!(status || marketplace || q || datFrom || datTo);

  return (
    <AppShell>
      <PageHeader title="Bestellungen" eyebrow="Alle Marktplatz-Bestellungen" />

      <div className="mb-3 font-mono text-[10px] text-grey-mid">
        Letzte Aktualisierung: {lastImport ? new Date(lastImport.value).toLocaleString("de-DE", { timeZone: "Europe/Berlin" }) : "—"}
      </div>

      <form method="GET" className="mb-5 flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Suche</span>
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Bestellnr., Name, SKU …"
            className={`${inputClass} w-56`}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Von</span>
          <input type="date" name="datFrom" defaultValue={datFrom ?? ""} className={inputClass} />
        </label>
        <label className="grid gap-1.5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Bis</span>
          <input type="date" name="datTo" defaultValue={datTo ?? ""} className={inputClass} />
        </label>
        <label className="grid gap-1.5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Status</span>
          <select name="status" defaultValue={status ?? ""} className={inputClass}>
            <option value="">Alle</option>
            <option value="NEU">Offen</option>
            <option value="ABGESCHLOSSEN">Abgeschlossen</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Marktplatz</span>
          <select name="marketplace" defaultValue={marketplace ?? ""} className={inputClass}>
            <option value="">Alle</option>
            <option value="OTTO">Otto</option>
            <option value="AMAZON">Amazon</option>
            <option value="KAUFLAND">Kaufland</option>
            <option value="SHOPIFY">Shopify</option>
            <option value="MEDIAMARKT">MediaMarkt</option>
            <option value="EBAY">eBay</option>
          </select>
        </label>
        <button type="submit" className="h-9 rounded-lg bg-brand-red px-4 text-sm font-semibold text-white hover:bg-brand-red-dark">
          Anzeigen
        </button>
        {hasFilter && (
          <a href="/bestellungen" className="h-9 inline-flex items-center rounded-lg border border-grey-border bg-white px-4 font-mono text-sm font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors">
            Zurücksetzen
          </a>
        )}
        <span className="ml-auto self-end pb-1.5 font-mono text-xs text-grey-mid">{orders.length} Bestellungen</span>
      </form>

      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-grey-border bg-grey-light">
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Datum</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Marktplatz</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Kunde</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">SKU</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-border">
            {orders.map((order) => (
              <tr key={order.id} className="cursor-pointer transition-colors hover:bg-grey-light/60">
                <td className="px-4 py-3 font-mono text-xs text-grey-mid">
                  <a href={`/bestellungen/${order.id}`} className="block w-full h-full">
                    {new Date(order.orderDate).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}
                    <div className="text-[10px] text-grey-mid/70">
                      {new Date(order.orderDate).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })} Uhr
                    </div>
                  </a>
                </td>
                <td className="px-4 py-3">
                  <a href={`/bestellungen/${order.id}`} className="block">
                    <span className="font-mono text-xs font-semibold text-brand-red">{order.marketplace}</span>
                  </a>
                </td>
                <td className="px-4 py-3 text-grey-dark">
                  <a href={`/bestellungen/${order.id}`} className="block">
                    <div className="font-semibold">{order.billingName ?? order.customerName}</div>
                    <div className="font-mono text-xs text-grey-mid">{order.zip} {order.city}</div>
                    {order.billingName && order.billingName !== order.customerName && (
                      <div className="font-mono text-[10px] text-grey-mid/70">Liefern: {order.customerName}</div>
                    )}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <a href={`/bestellungen/${order.id}`} className="block">
                    {order.orderNumber && (
                      <div className="mb-1 font-mono text-[11px] text-grey-mid">{order.orderNumber}</div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {order.items.slice(0, 2).map((item) => (
                        <span key={item.id} className="inline-flex items-center rounded border border-grey-border bg-grey-light px-1.5 py-0.5 font-mono text-xs font-semibold text-grey-dark">
                          {item.marketplaceSku}
                          {item.quantity > 1 && <span className="ml-1 text-grey-mid">×{item.quantity}</span>}
                        </span>
                      ))}
                      {order.items.length > 2 && (
                        <span className="inline-flex items-center rounded border border-grey-border bg-grey-light px-1.5 py-0.5 font-mono text-xs text-grey-mid">
                          +{order.items.length - 2}
                        </span>
                      )}
                    </div>
                  </a>
                </td>
                <td className="px-4 py-3">
                  <a href={`/bestellungen/${order.id}`} className="block">
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-semibold ${statusBadge[order.status] ?? statusBadge.NEU}`}>
                      {statusLabel[order.status] ?? order.status}
                    </span>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="p-10 text-center font-mono text-xs text-grey-mid">
            {hasFilter ? "Keine Bestellungen für diesen Filter." : "Noch keine Bestellungen importiert. Der automatische Import läuft alle 5 Minuten."}
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
