import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOKEN_URL = "https://api.otto.market/oauth2/token";
const ORDERS_URL = "https://api.otto.market/v4/orders?fulfillmentStatus=PROCESSABLE&limit=50";

type OttoAddress = {
  firstName: string;
  lastName: string;
  street: string;
  houseNumber?: string;
  zipCode: string;
  city: string;
  countryCode?: string;
  phoneNumber?: string;
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    resources?: {
      salesOrderId: string;
      deliveryAddress: OttoAddress;
      invoiceAddress?: OttoAddress;
    }[];
  };

  const ottoOrders = data.resources ?? [];

  const ottoMap = new Map(
    ottoOrders.map((o) => [
      o.salesOrderId,
      { deliveryAddress: o.deliveryAddress, invoiceAddress: o.invoiceAddress },
    ])
  );

  // Find DB orders with missing billing data
  const dbOrders = await prisma.order.findMany({
    where: { OR: [{ billingName: null }, { phoneNumber: null }] },
    select: { id: true, externalId: true, billingName: true, phoneNumber: true },
  });

  let updatedBilling = 0;
  let updatedPhone = 0;

  for (const dbOrder of dbOrders) {
    const otto = ottoMap.get(dbOrder.externalId);
    if (!otto) continue;

    const updates: Record<string, string | undefined> = {};

    if (!dbOrder.billingName && otto.invoiceAddress) {
      const inv = otto.invoiceAddress;
      updates.billingName    = `${inv.firstName} ${inv.lastName}`.trim();
      updates.billingStreet  = `${inv.street}${inv.houseNumber ? " " + inv.houseNumber : ""}`;
      updates.billingZip     = inv.zipCode;
      updates.billingCity    = inv.city;
      updates.billingCountry = inv.countryCode;
      updatedBilling++;
    }

    if (!dbOrder.phoneNumber && otto.deliveryAddress.phoneNumber) {
      updates.phoneNumber = otto.deliveryAddress.phoneNumber;
      updatedPhone++;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.order.update({ where: { id: dbOrder.id }, data: updates });
    }
  }

  return NextResponse.json({ ok: true, checked: dbOrders.length, updatedBilling, updatedPhone });
}
