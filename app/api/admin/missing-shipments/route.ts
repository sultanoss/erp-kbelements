import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Shows shipments from before today that are salesCreated=true (set by backfill)
// filtered to a specific SKU — so we can identify missing sales
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (secret !== "kb-backfill-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sku = url.searchParams.get("sku") ?? "ELK60PB1";

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 7);
  windowStart.setHours(0, 0, 0, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const shipments = await prisma.shipment.findMany({
    where: {
      salesCreated: true,
      createdAt: { gte: windowStart, lt: todayStart },
      items: { some: { internalSku: sku } },
    },
    include: {
      order: { select: { marketplace: true, orderNumber: true, externalId: true } },
      items: { where: { internalSku: sku } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    sku,
    count: shipments.length,
    shipments: shipments.map(s => ({
      id: s.id,
      createdAt: s.createdAt,
      marketplace: s.order.marketplace,
      orderNumber: s.order.orderNumber,
      qty: s.items.reduce((sum, i) => sum + i.quantity, 0),
    })),
  });
}
