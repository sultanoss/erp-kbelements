import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOttoShipmentNotification } from "@/lib/connectors/otto";

export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, shipments: true },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const shipment = order.shipments[0];
  if (!shipment) return NextResponse.json({ error: "No shipment found" }, { status: 404 });

  const positionItemIds = order.items
    .map((i) => i.positionItemId)
    .filter((id): id is string => !!id);

  const info = {
    orderId: order.id,
    externalId: order.externalId,
    marketplace: order.marketplace,
    shipmentStatus: shipment.status,
    trackingNumber: shipment.trackingNumber,
    returnTrackingNumber: shipment.returnTrackingNumber,
    carrier: shipment.carrier,
    positionItemIds,
    itemCount: order.items.length,
  };

  if (shipment.status === "PORTAL_NOTIFIED") {
    return NextResponse.json({ ...info, result: "already_notified" });
  }

  if (positionItemIds.length === 0) {
    return NextResponse.json({ ...info, result: "no_position_item_ids" }, { status: 400 });
  }

  if (!shipment.trackingNumber) {
    return NextResponse.json({ ...info, result: "no_tracking_number" }, { status: 400 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    await sendOttoShipmentNotification({
      salesOrderId: order.externalId,
      carrier: shipment.carrier as "DHL" | "GEL",
      trackingNumber: shipment.trackingNumber,
      returnTrackingNumber: shipment.returnTrackingNumber ?? undefined,
      positionItemIds,
      shipDate: today,
    });
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: "PORTAL_NOTIFIED", notifiedOttoAt: new Date() },
    });
    return NextResponse.json({ ...info, result: "success" });
  } catch (e) {
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: "NOTIFY_FAILED" },
    });
    return NextResponse.json({ ...info, result: "failed", error: (e as Error).message }, { status: 500 });
  }
}
