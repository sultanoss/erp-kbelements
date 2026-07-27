import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Shows shipments from before today (last 7 days) that were backfill-marked,
// with their items excluding NS_LAGER (warehouse=ns) — to identify missing TAGESVERKAUF sales
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (secret !== "kb-backfill-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 7);
  windowStart.setHours(0, 0, 0, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const shipments = await prisma.shipment.findMany({
    where: {
      salesCreated: true,
      createdAt: { gte: windowStart, lt: todayStart },
    },
    include: {
      order: { select: { marketplace: true, orderNumber: true } },
      items: {
        where: { warehouse: { not: "ns" } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Only shipments that have non-NS items
  const relevant = shipments.filter(s => s.items.length > 0);

  // Aggregate by SKU
  const bySku: Record<string, number> = {};
  for (const s of relevant) {
    for (const item of s.items) {
      bySku[item.internalSku] = (bySku[item.internalSku] ?? 0) + item.quantity;
    }
  }

  return NextResponse.json({
    shipmentCount: relevant.length,
    bySku: Object.entries(bySku).sort((a, b) => b[1] - a[1]).map(([sku, qty]) => ({ sku, qty })),
    detail: relevant.map(s => ({
      id: s.id,
      createdAt: s.createdAt,
      marketplace: s.order.marketplace,
      orderNumber: s.order.orderNumber,
      items: s.items.map(i => ({ sku: i.internalSku, qty: i.quantity })),
    })),
  });
}
