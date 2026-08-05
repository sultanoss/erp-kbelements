import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const externalId = new URL(request.url).searchParams.get("id");
  const fix = new URL(request.url).searchParams.get("fix") === "1";
  if (!externalId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const order = await prisma.order.findFirst({
    where: { OR: [{ externalId }, { id: externalId }, { orderNumber: externalId }] },
    include: { items: true, shipments: { include: { items: true } } },
  });

  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Fix: Bestellung auf ABGESCHLOSSEN setzen wenn alle Shipments PORTAL_NOTIFIED
  if (fix && order.status === "NEU") {
    const allNotified = order.shipments.length > 0 && order.shipments.every(s => s.status === "PORTAL_NOTIFIED");
    if (allNotified) {
      await prisma.order.update({ where: { id: order.id }, data: { status: "ABGESCHLOSSEN" } });
    }
  }

  return NextResponse.json({
    id: order.id,
    externalId: order.externalId,
    status: order.status,
    marketplace: order.marketplace,
    items: order.items.map(i => ({
      marketplaceSku: i.marketplaceSku,
      internalSku: i.internalSku,
      positionItemId: i.positionItemId,
    })),
    shipments: order.shipments.map(s => ({
      id: s.id,
      carrier: s.carrier,
      status: s.status,
      trackingNumber: s.trackingNumber,
      positionItemIds: s.positionItemIds,
      shipmentItems: s.items.map(i => i.internalSku),
    })),
    fixed: fix ? "ABGESCHLOSSEN gesetzt" : undefined,
  });
}
