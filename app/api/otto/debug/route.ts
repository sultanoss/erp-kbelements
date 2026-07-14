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

  // Step 2: Try different scopes to find valid ones
  const scopesToTry = ["Orders", "orders", "Shipments", "fulfillment", "openid", "partner", "portal", "api"];
  results.scope_tests = {};
  for (const scope of scopesToTry) {
    try {
      const r = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret, scope }),
      });
      const text = await r.text();
      if (r.ok) {
        const d = JSON.parse(text) as { access_token: string };
        const parts = d.access_token.split(".");
        if (parts.length === 3) {
          const p = JSON.parse(Buffer.from(parts[1], "base64").toString()) as { scope: string };
          (results.scope_tests as Record<string, unknown>)[scope] = { status: r.status, granted_scope: p.scope };
        }
      } else {
        (results.scope_tests as Record<string, unknown>)[scope] = { status: r.status, error: text };
      }
    } catch { /* ignore */ }
  }

  // Step 4: Get raw order structure (first order only)
  try {
    const ordersRes = await fetch("https://api.otto.market/v4/orders?fulfillmentStatus=PROCESSABLE&limit=1", { headers });
    if (ordersRes.ok) {
      results.raw_orders_sample = await ordersRes.json();
    } else {
      results.raw_orders_error = { status: ordersRes.status, body: await ordersRes.text() };
    }
  } catch (e) {
    results.raw_orders_exception = (e as Error).message;
  }

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
}
