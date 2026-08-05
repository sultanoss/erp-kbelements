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

  const pendingShipments = order.shipments.filter(
    (s) => s.status !== "PORTAL_NOTIFIED" && s.status !== "STORNIERT",
  );

  if (pendingShipments.length === 0) {
    return NextResponse.json({ orderId: order.id, result: "already_notified" });
  }

  const results = [];

  for (const shipment of pendingShipments) {
    if (!shipment.trackingNumber) {
      results.push({ shipmentId: shipment.id, result: "no_tracking_number" });
      continue;
    }

    // positionItemIds: aus Sendung (neu) oder Fallback alle Order-Items
    const positionItemIds =
      shipment.positionItemIds.length > 0
        ? shipment.positionItemIds
        : order.items.map((i) => i.positionItemId).filter((id): id is string => !!id);

    if (positionItemIds.length === 0) {
      results.push({ shipmentId: shipment.id, result: "no_position_item_ids" });
      continue;
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
      results.push({ shipmentId: shipment.id, result: "success", positionItemIds });
    } catch (e) {
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: { status: "NOTIFY_FAILED" },
      });
      results.push({ shipmentId: shipment.id, result: "failed", error: (e as Error).message });
    }
  }

  const allSuccess = results.every((r) => r.result === "success");
  return NextResponse.json(
    { orderId: order.id, results },
    { status: allSuccess ? 200 : 500 },
  );
}
