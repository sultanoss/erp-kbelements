import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendMediaMarktShipmentNotification, uploadMediaMarktInvoice } from "@/lib/connectors/mediamarkt";
import { createInvoiceFromOrder } from "@/lib/invoice-helper";
import { generateInvoicePdf } from "@/lib/invoice-pdf";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orderId = new URL(request.url).searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, shipments: true },
  });
  if (!order) return NextResponse.json({ error: "Bestellung nicht gefunden" }, { status: 404 });
  if (order.marketplace !== "MEDIAMARKT") {
    return NextResponse.json({ error: "Nicht eine MediaMarkt-Bestellung" }, { status: 400 });
  }

  const shipment = order.shipments[0];
  if (!shipment) return NextResponse.json({ error: "Kein Versand gefunden" }, { status: 404 });
  if (!shipment.trackingNumber) {
    return NextResponse.json({ error: "Keine Sendungsnummer vorhanden" }, { status: 400 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Kein Benutzer-ID in Session" }, { status: 500 });

  try {
    const inv = await createInvoiceFromOrder(order, userId);
    const pdfBytes = await generateInvoicePdf(inv);

    await sendMediaMarktShipmentNotification({
      orderId: order.externalId,
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier as "DHL" | "GEL",
    });

    await uploadMediaMarktInvoice(order.externalId, pdfBytes, `${inv.number}.pdf`);

    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: "PORTAL_NOTIFIED" },
    });

    return NextResponse.json({
      result: "success",
      invoiceNumber: inv.number,
      trackingNumber: shipment.trackingNumber,
    });
  } catch (e) {
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: "NOTIFY_FAILED" },
    });
    return NextResponse.json({ result: "failed", error: (e as Error).message }, { status: 500 });
  }
}
