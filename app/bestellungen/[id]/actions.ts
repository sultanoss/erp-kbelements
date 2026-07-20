"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getShippingProvider } from "@/lib/shipping";
import type { ShipmentResult } from "@/lib/shipping/types";
import { sendOttoShipmentNotification } from "@/lib/connectors/otto";
import { sendKauflandShipmentNotification, uploadKauflandInvoice } from "@/lib/connectors/kaufland";
import { sendMediaMarktShipmentNotification, uploadMediaMarktInvoice } from "@/lib/connectors/mediamarkt";
import { sendShopifyFulfillment } from "@/lib/connectors/shopify";
import { sendEbayShipment } from "@/lib/connectors/ebay";
import { createInvoiceFromOrder } from "@/lib/invoice-helper";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { auth } from "@/auth";
import { cancelDHLShipment } from "@/lib/shipping/dhl";
import { stornoInvoice } from "@/app/actions";

export async function markAsAbgeschlossen(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.order.update({ where: { id }, data: { status: "ABGESCHLOSSEN" } });
  revalidatePath(`/bestellungen/${id}`);
  revalidatePath("/bestellungen");
  revalidatePath("/");
}

export async function markAsOffen(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.order.update({ where: { id }, data: { status: "NEU" } });
  revalidatePath(`/bestellungen/${id}`);
  revalidatePath("/bestellungen");
  revalidatePath("/");
}

export type ShipOrderResult =
  | { ok: true; trackingNumber: string; labelUrl?: string; returnTrackingNumber?: string; sandbox?: boolean }
  | { ok: false; error: string };

export async function shipOrder(formData: FormData): Promise<ShipOrderResult> {
  const id = formData.get("id") as string;
  const carrier = formData.get("carrier") as "DHL" | "GEL";
  const weight = formData.get("weight") ? parseFloat(formData.get("weight") as string) : undefined;
  const manualTracking = (formData.get("trackingNumber") as string | null)?.trim() || undefined;
  const itemsJson = formData.get("items") as string;
  const shipName    = (formData.get("shipName")    as string | null)?.trim() || null;
  const shipStreet  = (formData.get("shipStreet")  as string | null)?.trim() || null;
  const shipZip     = (formData.get("shipZip")     as string | null)?.trim() || null;
  const shipCity    = (formData.get("shipCity")    as string | null)?.trim() || null;
  const shipCountry = (formData.get("shipCountry") as string | null)?.trim() || null;

  if (!id || !carrier) return { ok: false, error: "Fehlende Pflichtfelder" };
  if (carrier !== "DHL" && carrier !== "GEL") return { ok: false, error: "Ungültiger Carrier" };

  let items: { internalSku: string; quantity: number; warehouse: "neuware" | "ns" }[];
  let manualItems: { description: string; quantity: number; warehouse: string }[] = [];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    return { ok: false, error: "Ungültige Artikel-Daten" };
  }
  try {
    const manualJson = formData.get("manualItems") as string | null;
    if (manualJson) manualItems = JSON.parse(manualJson);
  } catch { /* ignore */ }
  if (!items?.length && !manualItems?.length) return { ok: false, error: "Keine Artikel ausgewählt" };

  // Load order
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Bestellung nicht gefunden" };
  if (order.status === "ABGESCHLOSSEN") return { ok: false, error: "Bestellung bereits abgeschlossen" };

  // Check for existing shipment
  const existingShipment = await prisma.shipment.findFirst({ where: { orderId: id } });
  if (existingShipment) return { ok: false, error: "Für diese Bestellung wurde bereits ein Versand erstellt" };

  // Validate stock
  for (const item of items) {
    const dbItem = await prisma.item.findUnique({ where: { sku: item.internalSku } });
    if (!dbItem) return { ok: false, error: `Artikel ${item.internalSku} nicht gefunden` };
    const available = item.warehouse === "ns" ? dbItem.stockNS : dbItem.stock;
    if (available < item.quantity) {
      return {
        ok: false,
        error: `Nicht genug Bestand für ${item.internalSku}: ${available} verfügbar, ${item.quantity} angefordert`,
      };
    }
  }

  // Call carrier service — if this fails, nothing is saved
  let shipmentResult: ShipmentResult;
  try {
    const provider = getShippingProvider(carrier);
    shipmentResult = await provider.createShipment({
      orderId: id,
      orderNumber: order.orderNumber ?? undefined,
      carrier,
      weight,
      trackingNumber: manualTracking,
      consignee: {
        name:    shipName    ?? order.customerName,
        street:  shipStreet  ?? order.street,
        zip:     shipZip     ?? order.zip,
        city:    shipCity    ?? order.city,
        country: shipCountry ?? order.country,
      },
      items,
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  // Sandbox: nur DHL-Verbindung testen — kein DB-Schreibvorgang, kein Lagerabzug, kein Otto-Call
  if (process.env.DHL_ENV === "sandbox") {
    return {
      ok: true,
      trackingNumber: shipmentResult.trackingNumber,
      labelUrl: shipmentResult.labelUrl,
      sandbox: true,
    };
  }

  // Transaction: create shipment + deduct inventory + update order
  let shipmentId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create shipment record
      const shipment = await tx.shipment.create({
        data: {
          orderId: id,
          carrier,
          status: "LABEL_CREATED",
          trackingNumber:       shipmentResult.trackingNumber,
          labelUrl:             shipmentResult.labelUrl,
          returnTrackingNumber: shipmentResult.returnTrackingNumber,
          returnLabelUrl:       shipmentResult.returnLabelUrl,
          dhlShipmentId:        shipmentResult.dhlShipmentId,
          weight,
          carrierResponse: shipmentResult.carrierResponse as never,
          items: {
            create: items.map((item) => ({
              internalSku: item.internalSku,
              quantity: item.quantity,
              warehouse: item.warehouse,
            })),
          },
        },
      });

      // Deduct inventory
      for (const item of items) {
        if (item.warehouse === "ns") {
          await tx.item.update({
            where: { sku: item.internalSku },
            data: { stockNS: { decrement: item.quantity } },
          });
        } else {
          await tx.item.update({
            where: { sku: item.internalSku },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      // Mark order as done
      await tx.order.update({
        where: { id },
        data: {
          status: "ABGESCHLOSSEN",
          trackingNumber: shipmentResult.trackingNumber,
        },
      });

      return shipment;
    });
    shipmentId = result.id;
  } catch (e) {
    return { ok: false, error: `Datenbankfehler: ${(e as Error).message}` };
  }

  // Otto notification (outside transaction — failure doesn't roll back the shipment)
  if (order.marketplace === "OTTO") {
    const positionItemIds = order.items
      .map((i) => i.positionItemId)
      .filter((id): id is string => !!id);

    if (positionItemIds.length > 0) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        await sendOttoShipmentNotification({
          salesOrderId: order.externalId,
          carrier,
          trackingNumber: shipmentResult.trackingNumber,
          returnTrackingNumber: shipmentResult.returnTrackingNumber,
          positionItemIds,
          shipDate: today,
        });
        await prisma.shipment.update({
          where: { id: shipmentId },
          data: { status: "PORTAL_NOTIFIED", notifiedOttoAt: new Date() },
        });
      } catch {
        await prisma.shipment.update({
          where: { id: shipmentId },
          data: { status: "NOTIFY_FAILED" },
        });
      }
    }
  }

  // Kaufland: automatisch Rechnung erstellen, Sendungsnummer melden, Rechnung hochladen
  if (order.marketplace === "KAUFLAND") {
    const orderUnitIds = order.items
      .map((i) => i.positionItemId)
      .filter((pid): pid is string => !!pid);

    try {
      const session = await auth();
      const userId = (session?.user as { id?: string } | null)?.id;
      if (!userId) throw new Error("Kein Benutzer-Kontext");

      const inv = await createInvoiceFromOrder(order, userId);
      const pdfBytes = await generateInvoicePdf(inv);

      if (orderUnitIds.length > 0) {
        await sendKauflandShipmentNotification({
          orderUnitIds,
          trackingNumber: shipmentResult.trackingNumber,
          carrier,
        });
      }

      await uploadKauflandInvoice(order.externalId, pdfBytes, `${inv.number}.pdf`);

      await prisma.shipment.update({
        where: { id: shipmentId },
        data: { status: "PORTAL_NOTIFIED" },
      });
      revalidatePath("/buchhaltung");
    } catch (err) {
      console.error("Kaufland-Meldung fehlgeschlagen:", err);
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: { status: "NOTIFY_FAILED" },
      });
    }
  }

  if (order.marketplace === "MEDIAMARKT") {
    try {
      const session2 = await auth();
      const userId2 = (session2?.user as { id?: string } | null)?.id;
      const inv = await createInvoiceFromOrder(order, userId2 ?? "");
      const pdfBytes = await generateInvoicePdf(inv);
      const mmLineIds = order.items.map((i) => i.positionItemId).filter((x): x is string => !!x);
      await sendMediaMarktShipmentNotification({
        orderId: order.externalId,
        trackingNumber: shipmentResult.trackingNumber,
        carrier,
        orderLineIds: mmLineIds,
      });
      await uploadMediaMarktInvoice(order.externalId, pdfBytes, `${inv.number}.pdf`);
      await prisma.shipment.update({ where: { id: shipmentId }, data: { status: "PORTAL_NOTIFIED" } });
      revalidatePath("/buchhaltung");
    } catch (err) {
      console.error("MediaMarkt-Meldung fehlgeschlagen:", err);
      await prisma.shipment.update({ where: { id: shipmentId }, data: { status: "NOTIFY_FAILED" } });
    }
  }

  if (order.marketplace === "EBAY") {
    const lineItems = order.items
      .filter((i) => i.positionItemId)
      .map((i) => ({ lineItemId: i.positionItemId!, quantity: i.quantity }));

    try {
      const session = await auth();
      const userId = (session?.user as { id?: string } | null)?.id;
      if (!userId) throw new Error("Kein Benutzer-Kontext");

      await createInvoiceFromOrder(order, userId);

      await sendEbayShipment({
        orderId: order.externalId,
        trackingNumber: shipmentResult.trackingNumber,
        carrier,
        lineItems,
      });
      await prisma.shipment.update({ where: { id: shipmentId }, data: { status: "PORTAL_NOTIFIED" } });
      revalidatePath("/buchhaltung");
    } catch (err) {
      console.error("eBay-Meldung fehlgeschlagen:", err);
      await prisma.shipment.update({ where: { id: shipmentId }, data: { status: "NOTIFY_FAILED" } });
    }
  }

  if (order.marketplace === "SHOPIFY") {
    try {
      await sendShopifyFulfillment({
        orderId: order.externalId,
        trackingNumber: shipmentResult.trackingNumber,
        carrier,
      });
      await prisma.shipment.update({ where: { id: shipmentId }, data: { status: "PORTAL_NOTIFIED" } });
    } catch (err) {
      console.error("Shopify-Meldung fehlgeschlagen:", err);
      await prisma.shipment.update({ where: { id: shipmentId }, data: { status: "NOTIFY_FAILED" } });
    }
  }

  revalidatePath(`/bestellungen/${id}`);
  revalidatePath("/bestellungen");
  revalidatePath("/");

  return { ok: true, trackingNumber: shipmentResult.trackingNumber, labelUrl: shipmentResult.labelUrl, returnTrackingNumber: shipmentResult.returnTrackingNumber };
}

export async function storniereBestellung(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { shipments: { include: { items: true } } },
  });
  if (!order || order.status === "STORNIERT") return;

  const shipment = order.shipments[0];

  if (shipment?.trackingNumber && shipment.carrier === "DHL") {
    try { await cancelDHLShipment(shipment.trackingNumber); } catch { /* best-effort */ }
  }

  const invoice = await prisma.invoice.findFirst({
    where: { orderId: id, status: "aktiv" },
  });
  if (invoice) {
    await stornoInvoice(invoice.id);
  } else if (shipment?.items.length) {
    for (const item of shipment.items) {
      await prisma.item.update({
        where: { sku: item.internalSku },
        data: item.warehouse === "ns"
          ? { stockNS: { increment: item.quantity } }
          : { stock: { increment: item.quantity } },
      });
    }
  }

  await prisma.order.update({ where: { id }, data: { status: "STORNIERT" } });
  if (shipment) {
    await prisma.shipment.update({ where: { id: shipment.id }, data: { status: "STORNIERT" } });
  }

  revalidatePath(`/bestellungen/${id}`);
  revalidatePath("/bestellungen");
  revalidatePath("/");
  revalidatePath("/buchhaltung");
}
