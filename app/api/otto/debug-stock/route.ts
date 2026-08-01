import { NextResponse } from "next/server";

const TOKEN_URL = "https://api.otto.market/oauth2/token";
const BASE = "https://api.otto.market";

async function getToken(scope = ""): Promise<string> {
  const params: Record<string, string> = {
    grant_type: "client_credentials",
    client_id: process.env.OTTO_CLIENT_ID!,
    client_secret: process.env.OTTO_CLIENT_SECRET!,
  };
  if (scope) params.scope = scope;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const data = await res.json() as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(JSON.stringify(data));
  return data.access_token;
}

export async function GET() {
  const token = await getToken("");
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const testSku = "ELK75DV1";
  const encoded = encodeURIComponent(testSku);

  const tests = await Promise.all([
    // 1. GET single product
    fetch(`${BASE}/v2/products/${encoded}`, { headers: h })
      .then(async r => ({ test: `GET /v2/products/${testSku}`, status: r.status, body: await r.text().then(t => t.slice(0, 300)) })),

    // 2. PATCH /v2/products/{sku}/active-status (sku in path)
    fetch(`${BASE}/v2/products/${encoded}/active-status`, {
      method: "PATCH", headers: h, body: JSON.stringify({ availableQuantity: 5 }),
    }).then(async r => ({ test: `PATCH /v2/products/${testSku}/active-status`, status: r.status, body: await r.text().then(t => t.slice(0, 300)) })),

    // 3. POST /v2/products (batch upsert)
    fetch(`${BASE}/v2/products`, {
      method: "POST", headers: h, body: JSON.stringify([{ sku: testSku, availableQuantity: 5 }]),
    }).then(async r => ({ test: "POST /v2/products [{sku, availableQuantity}]", status: r.status, body: await r.text().then(t => t.slice(0, 300)) })),

    // 4. PATCH /v2/products (batch)
    fetch(`${BASE}/v2/products`, {
      method: "PATCH", headers: h, body: JSON.stringify([{ sku: testSku, availableQuantity: 5 }]),
    }).then(async r => ({ test: "PATCH /v2/products [{sku, availableQuantity}]", status: r.status, body: await r.text().then(t => t.slice(0, 300)) })),

    // 5. PATCH /v2/products/{sku} with active field
    fetch(`${BASE}/v2/products/${encoded}`, {
      method: "PATCH", headers: h, body: JSON.stringify({ active: true, availableQuantity: 5 }),
    }).then(async r => ({ test: `PATCH /v2/products/${testSku} {active, availableQuantity}`, status: r.status, body: await r.text().then(t => t.slice(0, 300)) })),

    // 6. v3 products
    fetch(`${BASE}/v3/products/${encoded}`, { headers: h })
      .then(async r => ({ test: `GET /v3/products/${testSku}`, status: r.status, body: await r.text().then(t => t.slice(0, 300)) })),
  ]);

  return NextResponse.json({ token: token.slice(0, 20) + "...", tests }, { headers: { "Cache-Control": "no-store" } });
}
