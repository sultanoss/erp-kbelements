import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEbayShipment } from "@/lib/connectors/ebay";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) return Response.json({ error: "orderId fehlt" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shipments: true, items: true },
  });

  if (!order || order.marketplace !== "EBAY") {
    return Response.json({ error: "Bestellung nicht gefunden oder kein eBay-Auftrag" }, { status: 404 });
  }

  const shipment = order.shipments[0];
  if (!shipment?.trackingNumber) {
    return Response.json({ error: "Kein Tracking vorhanden" }, { status: 400 });
  }

  const lineItems = order.items
    .filter((i) => i.positionItemId)
    .map((i) => ({ lineItemId: i.positionItemId!, quantity: i.quantity }));

  try {
    await sendEbayShipment({
      orderId: order.externalId,
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier as "DHL" | "GEL",
      lineItems,
    });
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: "PORTAL_NOTIFIED" },
    });
    return Response.json({ result: "success" });
  } catch (err) {
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: "NOTIFY_FAILED" },
    });
    return Response.json({ result: "failed", error: (err as Error).message });
  }
}
