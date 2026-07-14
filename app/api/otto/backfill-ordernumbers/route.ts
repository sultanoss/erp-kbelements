import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOKEN_URL = "https://api.otto.market/oauth2/token";
const ORDERS_URL = "https://api.otto.market/v4/orders?fulfillmentStatus=PROCESSABLE&limit=50";

export async function GET() {
  // Get token
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.OTTO_CLIENT_ID!,
      client_secret: process.env.OTTO_CLIENT_SECRET!,
      scope: "orders",
    }),
  });
  if (!tokenRes.ok) return NextResponse.json({ error: await tokenRes.text() }, { status: 500 });
  const { access_token } = await tokenRes.json() as { access_token: string };

  // Fetch orders from Otto
  const ordersRes = await fetch(ORDERS_URL, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!ordersRes.ok) return NextResponse.json({ error: await ordersRes.text() }, { status: 500 });

  const data = await ordersRes.json() as {
    resources?: { salesOrderId: string; orderNumber?: string }[];
  };

  const ottoOrders = data.resources ?? [];
  const ottoMap = new Map(ottoOrders.map((o) => [o.salesOrderId, o.orderNumber]));

  // Find DB orders with missing orderNumber
  const dbOrders = await prisma.order.findMany({ where: { orderNumber: null }, select: { id: true, externalId: true } });

  let updated = 0;
  for (const dbOrder of dbOrders) {
    const orderNumber = ottoMap.get(dbOrder.externalId);
    if (orderNumber) {
      await prisma.order.update({ where: { id: dbOrder.id }, data: { orderNumber } });
      updated++;
    }
  }

  return NextResponse.json({ ok: true, checked: dbOrders.length, updated });
}
