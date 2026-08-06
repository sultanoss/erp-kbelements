import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DHLShippingProvider } from "@/lib/shipping/dhl";
import { sendOttoShipmentNotification } from "@/lib/connectors/otto";

const OTTO_TOKEN_URL = "https://api.otto.market/oauth2/token";
const OTTO_ORDERS_URL = "https://api.otto.market/v4/orders";

async function getOttoToken() {
  const params = {
    grant_type: "client_credentials",
    client_id: process.env.OTTO_CLIENT_ID ?? "",
    client_secret: process.env.OTTO_CLIENT_SECRET ?? "",
    scope: "orders",
  };
  const res = await fetch(OTTO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  // 1. DB-Bestellung laden
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, shipments: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const usedPosIds = new Set(order.shipments.flatMap(s => s.positionItemIds));

  // 2. Otto-Bestellung laden → alle positionItemIds holen
  const token = await getOttoToken();
  const ottoRes = await fetch(`${OTTO_ORDERS_URL}/${order.externalId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!ottoRes.ok) {
    return NextResponse.json({ error: `Otto API ${ottoRes.status}: ${await ottoRes.text()}` }, { status: 500 });
  }
  const ottoOrder = await ottoRes.json() as {
    salesOrderId: string;
    positionItems?: Array<{ positionItemId: string; sku: string }>;
  };

  const allOttoPosIds = (ottoOrder.positionItems ?? []).map(p => p.positionItemId);
  const remainingPosIds = allOttoPosIds.filter(pid => !usedPosIds.has(pid));

  if (remainingPosIds.length === 0) {
    return NextResponse.json({ message: "Alle positionItemIds bereits versandt", allOttoPosIds, usedPosIds: [...usedPosIds] });
  }

  // 3. DHL-Label erstellen (12 kg, gleiche Adresse)
  const dhl = new DHLShippingProvider();
  const shipmentResult = await dhl.createShipment({
    orderId: order.id,
    orderNumber: order.orderNumber ?? undefined,
    carrier: "DHL",
    weight: 12,
    consignee: {
      name: order.customerName,
      street: order.street,
      zip: order.zip,
      city: order.city,
      country: order.country,
    },
    items: [{ internalSku: "ELK25MB1", quantity: 1, warehouse: "neuware" }],
  });

  // 4. Shipment in DB speichern
  const shipment = await prisma.shipment.create({
    data: {
      orderId: order.id,
      carrier: "DHL",
      status: "LABEL_CREATED",
      trackingNumber: shipmentResult.trackingNumber,
      labelUrl: shipmentResult.labelUrl,
      returnTrackingNumber: shipmentResult.returnTrackingNumber,
      returnLabelUrl: shipmentResult.returnLabelUrl,
      dhlShipmentId: shipmentResult.dhlShipmentId,
      positionItemIds: remainingPosIds,
      weight: 12,
    },
  });

  // 5. Otto benachrichtigen
  let ottoResult = "not_attempted";
  try {
    const today = new Date().toISOString().slice(0, 10);
    await sendOttoShipmentNotification({
      salesOrderId: order.externalId,
      carrier: "DHL",
      trackingNumber: shipmentResult.trackingNumber,
      returnTrackingNumber: shipmentResult.returnTrackingNumber ?? undefined,
      positionItemIds: remainingPosIds,
      shipDate: today,
    });
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: "PORTAL_NOTIFIED", notifiedOttoAt: new Date() },
    });
    ottoResult = "success";
  } catch (e) {
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: "NOTIFY_FAILED" },
    });
    ottoResult = `failed: ${(e as Error).message}`;
  }

  return NextResponse.json({
    trackingNumber: shipmentResult.trackingNumber,
    returnTrackingNumber: shipmentResult.returnTrackingNumber,
    positionItemIds: remainingPosIds,
    ottoResult,
  });
}
