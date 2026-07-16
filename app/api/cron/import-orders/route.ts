import { prisma } from "@/lib/prisma";
import { fetchNewOrders, type NormalizedOrder } from "@/lib/connectors/otto";
import { fetchKauflandOrders } from "@/lib/connectors/kaufland";

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
        if (existing) { skipped++; continue; }

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
    try {
      await saveOrders(await fetchKauflandOrders());
    } catch (e) {
      errors.push(`KAUFLAND: ${(e as Error).message}`);
    }
  }

  await prisma.setting.upsert({
    where:  { key: "lastOrderImport" },
    update: { value: new Date().toISOString() },
    create: { key: "lastOrderImport", value: new Date().toISOString() },
  });

  return Response.json({ ok: true, imported, skipped, errors });
}
