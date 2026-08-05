import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const externalId = new URL(request.url).searchParams.get("id");
  if (!externalId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const order = await prisma.order.findFirst({
    where: { externalId },
    include: { items: true, shipments: { include: { items: true } } },
  });

  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    id: order.id,
    externalId: order.externalId,
    status: order.status,
    marketplace: order.marketplace,
    items: order.items.map(i => ({
      marketplaceSku: i.marketplaceSku,
      internalSku: i.internalSku,
      positionItemId: i.positionItemId,
      quantity: i.quantity,
    })),
    shipments: order.shipments.map(s => ({
      id: s.id,
      carrier: s.carrier,
      status: s.status,
      trackingNumber: s.trackingNumber,
      positionItemIds: s.positionItemIds,
      items: s.items.map(i => ({ sku: i.internalSku, qty: i.quantity })),
    })),
  });
}
