import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOKEN_URL = "https://api.otto.market/oauth2/token";

export async function GET() {
  const clientId = process.env.OTTO_CLIENT_ID!;
  const clientSecret = process.env.OTTO_CLIENT_SECRET!;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret, scope: "orders" }),
  });

  if (!res.ok) return NextResponse.json({ error: await res.text() });
  const { access_token } = await res.json() as { access_token: string };
  const headers = { Authorization: `Bearer ${access_token}` };

  // Fetch first order from each status to find one with orderDate
  const statuses = ["PROCESSABLE", "SENT", "RETURNED", "CANCELLED_BY_MARKETPLACE"];
  const rawOrders: unknown[] = [];
  for (const status of statuses) {
    const r = await fetch(`https://api.otto.market/v4/orders?fulfillmentStatus=${status}&limit=1`, { headers });
    const d = await r.json() as { resources?: { salesOrderId: string; orderNumber?: string; orderDate: string }[] };
    if (d.resources?.length) rawOrders.push({ status, orderDate: d.resources[0].orderDate, orderNumber: d.resources[0].orderNumber });
  }

  // DB: check stored orderDate for first 3 orders
  const dbOrders = await prisma.order.findMany({ take: 3, orderBy: { createdAt: "desc" }, select: { orderNumber: true, orderDate: true } });
  const dbInfo = dbOrders.map(o => ({
    orderNumber: o.orderNumber,
    dbISO: o.orderDate.toISOString(),
    berlinDisplay: o.orderDate.toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
    utcDisplay: o.orderDate.toISOString().replace("T", " ").slice(0, 16) + " UTC",
  }));

  return NextResponse.json({ serverTimezone: process.env.TZ ?? "not set", rawOttoSamples: rawOrders, dbOrders: dbInfo }, { headers: { "Cache-Control": "no-store" } });
}
