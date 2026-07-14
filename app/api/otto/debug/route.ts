import { NextResponse } from "next/server";

const TOKEN_URL = "https://api.otto.market/oauth2/token";

export async function GET() {
  const clientId = process.env.OTTO_CLIENT_ID!;
  const clientSecret = process.env.OTTO_CLIENT_SECRET!;
  const results: Record<string, unknown> = {};

  // Step 1: Get token
  let token = "";
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    });
    const text = await res.text();
    results.token_status = res.status;
    if (res.ok) {
      const data = JSON.parse(text) as { access_token: string; expires_in: number };
      token = data.access_token;
      // Show token type/prefix (not the full token for security)
      results.token_preview = token.substring(0, 20) + "...";
      results.token_expires_in = data.expires_in;
      // Check if JWT (3 dot-separated parts)
      const parts = token.split(".");
      results.token_is_jwt = parts.length === 3;
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
          results.token_payload = payload;
        } catch { results.token_decode_error = "Cannot decode JWT payload"; }
      }
    } else {
      results.token_error = text;
    }
  } catch (e) {
    results.token_exception = (e as Error).message;
  }

  if (!token) return NextResponse.json(results);

  const headers = { Authorization: `Bearer ${token}` };

  // Step 2: Test various endpoints
  const endpoints = [
    { name: "orders_no_filter", url: "https://api.otto.market/v4/orders" },
    { name: "orders_processable", url: "https://api.otto.market/v4/orders?fulfillmentStatus=PROCESSABLE&limit=1" },
    { name: "orders_announced", url: "https://api.otto.market/v4/orders?fulfillmentStatus=ANNOUNCED&limit=1" },
    { name: "receipts_v2", url: "https://api.otto.market/v2/receipts" },
    { name: "products_v3", url: "https://api.otto.market/v3/products" },
    { name: "shipments_v1", url: "https://api.otto.market/v1/shipments" },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, { headers });
      let body: unknown;
      try { body = await res.json(); } catch { body = await res.text(); }
      results[ep.name] = { status: res.status, body };
    } catch (e) {
      results[ep.name] = { error: (e as Error).message };
    }
  }

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
}
