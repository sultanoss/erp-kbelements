import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { PortalGewinnClient } from "./portal-gewinn-client";

export const dynamic = "force-dynamic";

export default async function PortalGewinnPage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; bis?: string }>;
}) {
  const { von, bis } = await searchParams;

  const now = new Date();
  const vonDate = von ? new Date(von) : new Date(now.getFullYear(), 0, 1);
  const bisDate = bis ? new Date(bis) : now;
  bisDate.setHours(23, 59, 59, 999);

  const [items, setting, invoices] = await Promise.all([
    prisma.item.findMany({
      orderBy: { sku: "asc" },
      select: { sku: true, purchasePrice: true },
    }),
    prisma.setting.findUnique({ where: { key: "PORTAL_EXTRA_COSTS" } }),
    prisma.invoice.findMany({
      where: { marketplace: "MEDIAMARKT", status: "aktiv", date: { gte: vonDate, lte: bisDate } },
      select: { orderId: true },
    }),
  ]);

  // OrderItem-Preise für die gefundenen Bestellungen laden
  const orderIds = invoices.flatMap((i) => (i.orderId ? [i.orderId] : []));
  const orderItems = orderIds.length > 0
    ? await prisma.orderItem.findMany({
        where: { orderId: { in: orderIds }, internalSku: { not: null } },
        select: { internalSku: true, price: true, quantity: true },
      })
    : [];

  // Gewichteter Durchschnitt pro internem SKU
  const totals: Record<string, { revenue: number; qty: number }> = {};
  for (const item of orderItems) {
    if (!item.internalSku) continue;
    const s = (totals[item.internalSku] ??= { revenue: 0, qty: 0 });
    s.revenue += item.quantity * item.price;
    s.qty += item.quantity;
  }
  const avgSellPrice: Record<string, number> = {};
  for (const [sku, { revenue, qty }] of Object.entries(totals)) {
    if (qty > 0) avgSellPrice[sku] = revenue / qty;
  }

  const extraCosts: Record<string, number> = setting?.value
    ? (JSON.parse(setting.value) as Record<string, number>)
    : {};

  const vonStr = vonDate.toISOString().slice(0, 10);
  const bisStr = bisDate.toISOString().slice(0, 10);

  return (
    <AppShell>
      <PageHeader title="Portale Gewinn" eyebrow="B2B" />
      <PortalGewinnClient
        items={items}
        extraCosts={extraCosts}
        avgSellPrice={avgSellPrice}
        von={vonStr}
        bis={bisStr}
      />
    </AppShell>
  );
}
