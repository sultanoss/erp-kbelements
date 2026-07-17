import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadMediaMarktInvoice } from "@/lib/connectors/mediamarkt";
import { createInvoiceFromOrder } from "@/lib/invoice-helper";
import { generateInvoicePdf } from "@/lib/invoice-pdf";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tracking = new URL(request.url).searchParams.get("tracking");
  if (!tracking) return NextResponse.json({ error: "tracking erforderlich" }, { status: 400 });

  const shipment = await prisma.shipment.findFirst({
    where: { trackingNumber: tracking },
  });
  if (!shipment) return NextResponse.json({ error: "Sendung nicht gefunden" }, { status: 404 });

  const order = await prisma.order.findUnique({
    where: { id: shipment.orderId },
    include: { items: true, shipments: true },
  });
  if (!order) return NextResponse.json({ error: "Bestellung nicht gefunden" }, { status: 404 });
  if (order.marketplace !== "MEDIAMARKT") {
    return NextResponse.json({ error: "Nicht eine MediaMarkt-Bestellung" }, { status: 400 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Kein Benutzer-ID" }, { status: 500 });

  try {
    const inv = await createInvoiceFromOrder(order, userId);
    const pdfBytes = await generateInvoicePdf(inv);
    await uploadMediaMarktInvoice(order.externalId, pdfBytes, `${inv.number}.pdf`);
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: "PORTAL_NOTIFIED" },
    });
    return NextResponse.json({
      result: "success",
      invoiceNumber: inv.number,
      externalId: order.externalId,
      orderId: order.id,
    });
  } catch (e) {
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: "NOTIFY_FAILED" },
    });
    return NextResponse.json({ result: "failed", error: (e as Error).message }, { status: 500 });
  }
}
