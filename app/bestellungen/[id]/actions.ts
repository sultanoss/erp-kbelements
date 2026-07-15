"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getShippingProvider } from "@/lib/shipping";
import type { ShipmentResult } from "@/lib/shipping/types";
import { sendOttoShipmentNotification } from "@/lib/connectors/otto";

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
  | { ok: true; trackingNumber: string; labelUrl?: string; sandbox?: boolean }
  | { ok: false; error: string };

export async function shipOrder(formData: FormData): Promise<ShipOrderResult> {
  const id = formData.get("id") as string;
  const carrier = formData.get("carrier") as "DHL" | "GEL";
  const weight = formData.get("weight") ? parseFloat(formData.get("weight") as string) : undefined;
  const manualTracking = (formData.get("trackingNumber") as string | null)?.trim() || undefined;
  const itemsJson = formData.get("items") as string;

  if (!id || !carrier) return { ok: false, error: "Fehlende Pflichtfelder" };
  if (carrier !== "DHL" && carrier !== "GEL") return { ok: false, error: "Ungültiger Carrier" };

  let items: { internalSku: string; quantity: number; warehouse: "neuware" | "ns" }[];
  try {
    items = JSON.parse(itemsJson);
    if (!items?.length) return { ok: false, error: "Keine Artikel ausgewählt" };
  } catch {
    return { ok: false, error: "Ungültige Artikel-Daten" };
  }

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
        name: order.customerName,
        street: order.street,
        zip: order.zip,
        city: order.city,
        country: order.country,
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

  revalidatePath(`/bestellungen/${id}`);
  revalidatePath("/bestellungen");
  revalidatePath("/");

  return { ok: true, trackingNumber: shipmentResult.trackingNumber, labelUrl: shipmentResult.labelUrl };
}
