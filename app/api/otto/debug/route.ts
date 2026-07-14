import { NextResponse } from "next/server";

const TOKEN_URL = "https://api.otto.market/oauth2/token";

export async function GET() {
  const clientId = process.env.OTTO_CLIENT_ID!;
  const clientSecret = process.env.OTTO_CLIENT_SECRET!;

  // Get token with scope=orders (the working token)
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret, scope: "orders" }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: await res.text() });
  }

  const { access_token } = await res.json() as { access_token: string };
  const headers = { Authorization: `Bearer ${access_token}` };

  // Get one raw order to inspect structure
  const ordersRes = await fetch("https://api.otto.market/v4/orders?fulfillmentStatus=PROCESSABLE&limit=1", { headers });
  const raw = await ordersRes.json();

  return NextResponse.json({ status: ordersRes.status, raw }, { headers: { "Cache-Control": "no-store" } });
}
