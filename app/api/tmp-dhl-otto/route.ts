import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DHLShippingProvider } from "@/lib/shipping/dhl";
import { sendOttoShipmentNotification } from "@/lib/connectors/otto";

// Bestellung: cbn4yr6cty / DB-ID: cms2b4r6g000aju0450c40snv
const ORDER_DB_ID = "cms2b4r6g000aju0450c40snv";
const ORDER_NUMBER = "cbn4yr6cty";
const SALES_ORDER_ID = "43df3c99-8544-46c3-ba48-e0b454100914";
const POSITION_ELK25MB1 = "a0747ca9-a406-4076-9698-39d82104567d";
const POSITION_HERDSET = "dad1c9e3-db08-4e95-a880-22082fe8c8c5";
const GEL_TRACKING = "5039742747";
const EXISTING_SHIPMENT_ID = "cms2zhijp0005ld0488746jiy";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("s");
  if (secret !== "kb-tmp-9x2z") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const log: string[] = [];

  try {
    // 1. DHL Label für ELK25MB1 erstellen
    log.push("Erstelle DHL Label für ELK25MB1...");
    const dhl = new DHLShippingProvider();
    const dhlResult = await dhl.createShipment({
      orderId: ORDER_DB_ID,
      orderNumber: ORDER_NUMBER,
      carrier: "DHL",
      weight: 12,
      consignee: {
        name: "Medak Miroslaw",
        street: "Burgstr. 17",
        zip: "67229",
        city: "Laumersheim",
        country: "DEU",
      },
      items: [{ internalSku: "ELK25MB1", quantity: 1, warehouse: "neuware" }],
    });
    log.push(`DHL Tracking: ${dhlResult.trackingNumber}`);
    log.push(`DHL Retoure: ${dhlResult.returnTrackingNumber}`);
    log.push(`Label URL: ${dhlResult.labelUrl}`);

    // 2. Neues Shipment in DB speichern
    const newShipment = await prisma.shipment.create({
      data: {
        orderId: ORDER_DB_ID,
        carrier: "DHL",
        trackingNumber: dhlResult.trackingNumber,
        returnTrackingNumber: dhlResult.returnTrackingNumber ?? null,
        labelUrl: dhlResult.labelUrl ?? null,
        returnLabelUrl: dhlResult.returnLabelUrl ?? null,
        dhlShipmentId: dhlResult.dhlShipmentId ?? null,
        carrierResponse: dhlResult.carrierResponse as object,
        status: "LABEL_CREATED",
        salesCreated: false,
        labelPrinted: false,
      },
    });
    log.push(`Neues Shipment in DB: ${newShipment.id}`);

    // 3. Otto: ELK25MB1 mit DHL melden
    log.push("Sende Otto-Meldung für ELK25MB1 (DHL)...");
    await sendOttoShipmentNotification({
      salesOrderId: SALES_ORDER_ID,
      carrier: "DHL",
      trackingNumber: dhlResult.trackingNumber!,
      returnTrackingNumber: dhlResult.returnTrackingNumber ?? undefined,
      positionItemIds: [POSITION_ELK25MB1],
      shipDate: new Date().toISOString().slice(0, 10),
    });
    log.push("Otto ELK25MB1 → OK");

    // 4. Otto: Herd-Set mit GEL melden
    log.push("Sende Otto-Meldung für Herd-Set (GEL)...");
    await sendOttoShipmentNotification({
      salesOrderId: SALES_ORDER_ID,
      carrier: "GEL",
      trackingNumber: GEL_TRACKING,
      positionItemIds: [POSITION_HERDSET],
      shipDate: new Date().toISOString().slice(0, 10),
    });
    log.push("Otto Herd-Set → OK");

    // 5. Bestehenden GEL-Versand auf PORTAL_NOTIFIED setzen
    await prisma.shipment.update({
      where: { id: EXISTING_SHIPMENT_ID },
      data: { status: "PORTAL_NOTIFIED", notifiedOttoAt: new Date() },
    });
    // Neues DHL-Shipment auch auf PORTAL_NOTIFIED
    await prisma.shipment.update({
      where: { id: newShipment.id },
      data: { status: "PORTAL_NOTIFIED", notifiedOttoAt: new Date() },
    });
    log.push("Beide Shipments → PORTAL_NOTIFIED");

    return NextResponse.json({
      success: true,
      dhlTracking: dhlResult.trackingNumber,
      dhlReturn: dhlResult.returnTrackingNumber,
      labelUrl: dhlResult.labelUrl,
      returnLabelUrl: dhlResult.returnLabelUrl,
      log,
    });
  } catch (e) {
    log.push(`FEHLER: ${(e as Error).message}`);
    return NextResponse.json({ success: false, log, error: (e as Error).message }, { status: 500 });
  }
}
