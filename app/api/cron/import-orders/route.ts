import { prisma } from "@/lib/prisma";
import { fetchNewOrders, type NormalizedOrder } from "@/lib/connectors/otto";
import { fetchKauflandOrders } from "@/lib/connectors/kaufland";
import { fetchMediaMarktOrders } from "@/lib/connectors/mediamarkt";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  async function saveOrders(orders: NormalizedOrder[]) {
    for (const order of orders) {
      try {
        const existing = await prisma.order.findUnique({ where: { externalId: order.externalId } });
        if (existing) {
          // Bei schlechtem Import (UNKNOWN-Artikel oder Unbekannt-Name) → löschen und neu importieren
          const hasBadData = await prisma.orderItem.findFirst({
            where: { orderId: existing.id, marketplaceSku: "UNKNOWN" },
          });
          const hasBadName = existing.customerName === "Unbekannt";
          const hasBadAddress = !existing.street && !existing.zip;
          if (!hasBadData && !hasBadName && !hasBadAddress) { skipped++; continue; }
          await prisma.orderItem.deleteMany({ where: { orderId: existing.id } });
          await prisma.shipmentItem.deleteMany({ where: { shipment: { orderId: existing.id } } });
          await prisma.shipment.deleteMany({ where: { orderId: existing.id } });
          await prisma.order.delete({ where: { id: existing.id } });
        }

        await prisma.order.create({
          data: {
            externalId:    order.externalId,
            orderNumber:   order.orderNumber,
            marketplace:   order.marketplace,
            orderDate:     order.orderDate,
            customerName:  order.customerName,
            street:        order.street,
            zip:           order.zip,
            city:          order.city,
            country:       order.country,
            billingName:   order.billingName,
            billingStreet: order.billingStreet,
            billingZip:    order.billingZip,
            billingCity:   order.billingCity,
            billingCountry: order.billingCountry,
            phoneNumber:   order.phoneNumber,
            items: {
              create: order.items.map((item) => ({
                marketplaceSku: item.marketplaceSku,
                positionItemId: item.positionItemId,
                title:          item.title,
                quantity:       item.quantity,
                price:          item.price,
              })),
            },
          },
        });
        imported++;
      } catch (e) {
        errors.push(`${order.externalId}: ${(e as Error).message}`);
      }
    }
  }

  try {
    await saveOrders(await fetchNewOrders());
  } catch (e) {
    errors.push(`OTTO: ${(e as Error).message}`);
  }

  if (process.env.KAUFLAND_CLIENT_KEY) {
    const storefronts = (process.env.KAUFLAND_STOREFRONT ?? "de").split(",").map((s) => s.trim());
    for (const sf of storefronts) {
      try {
        // Nur Bestellungen ab Go-Live importieren (kein historischer Backlog)
        await saveOrders(await fetchKauflandOrders("2026-07-16T00:00:00Z", sf));
      } catch (e) {
        errors.push(`KAUFLAND/${sf.toUpperCase()}: ${(e as Error).message}`);
      }
    }
  }

  if (process.env.MEDIAMARKT_API_KEY) {
    try {
      await saveOrders(await fetchMediaMarktOrders("2026-07-16T00:00:00Z"));
    } catch (e) {
      errors.push(`MEDIAMARKT: ${(e as Error).message}`);
    }
  }

  await prisma.setting.upsert({
    where:  { key: "lastOrderImport" },
    update: { value: new Date().toISOString() },
    create: { key: "lastOrderImport", value: new Date().toISOString() },
  });

  return Response.json({ ok: true, imported, skipped, errors });
}
