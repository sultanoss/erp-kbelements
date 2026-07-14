import { prisma } from "@/lib/prisma";
import { fetchNewOrders } from "@/lib/connectors/otto";

export const maxDuration = 60;

export async function GET(request: Request) {
  // Vercel cron authentication
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    const orders = await fetchNewOrders();

    for (const order of orders) {
      try {
        const existing = await prisma.order.findUnique({ where: { externalId: order.externalId } });
        if (existing) { skipped++; continue; }

        await prisma.order.create({
          data: {
            externalId: order.externalId,
            orderNumber: order.orderNumber,
            marketplace: order.marketplace,
            orderDate: order.orderDate,
            customerName: order.customerName,
            street: order.street,
            zip: order.zip,
            city: order.city,
            country: order.country,
            items: {
              create: order.items.map((item) => ({
                marketplaceSku: item.marketplaceSku,
                title: item.title,
                quantity: item.quantity,
                price: item.price,
              })),
            },
          },
        });
        imported++;
      } catch (e) {
        errors.push(`${order.externalId}: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }

  return Response.json({ ok: true, imported, skipped, errors });
}
