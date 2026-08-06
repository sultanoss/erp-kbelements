import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("id");
  if (!q) return NextResponse.json({ error: "id required" }, { status: 400 });

  const order = await prisma.order.findFirst({
    where: { OR: [{ externalId: q }, { id: q }, { orderNumber: q }] },
    include: { items: true, shipments: true },
  });

  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    id: order.id,
    externalId: order.externalId,
    status: order.status,
    customerName: order.customerName,
    street: order.street,
    zip: order.zip,
    city: order.city,
    country: order.country,
    items: order.items.map(i => ({ marketplaceSku: i.marketplaceSku, internalSku: i.internalSku, positionItemId: i.positionItemId, quantity: i.quantity, title: i.title })),
    shipments: order.shipments.map(s => ({ carrier: s.carrier, status: s.status, trackingNumber: s.trackingNumber, returnTrackingNumber: s.returnTrackingNumber })),
  });
}
