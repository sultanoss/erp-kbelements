import { NextResponse } from "next/server";

const TOKEN_URL = "https://api.otto.market/oauth2/token";
const BASE = "https://api.otto.market";

async function getToken(scope = ""): Promise<{ token: string; error?: string }> {
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
  const data = await res.json() as { access_token?: string; error?: string; error_description?: string };
  if (!data.access_token) return { token: "", error: JSON.stringify(data) };
  return { token: data.access_token };
}

export async function GET() {
  const { token, error: tokenError } = await getToken("availability");
  if (!token) return NextResponse.json({ tokenError });

  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const testSku = "ELK75DV1";
  const encoded = encodeURIComponent(testSku);

  const tests = await Promise.all([
    fetch(`${BASE}/v2/products/${encoded}`, { headers: h })
      .then(async r => ({ test: `GET /v2/products/${testSku}`, status: r.status, body: (await r.text()).slice(0, 300) })),

    fetch(`${BASE}/v2/products/${encoded}`, {
      method: "PATCH", headers: h, body: JSON.stringify({ availableQuantity: 5 }),
    }).then(async r => ({ test: `PATCH /v2/products/${testSku}`, status: r.status, body: (await r.text()).slice(0, 300) })),

    fetch(`${BASE}/v2/products/active-status`, {
      method: "PATCH", headers: h, body: JSON.stringify([{ sku: testSku, availableQuantity: 5 }]),
    }).then(async r => ({ test: "PATCH /v2/products/active-status", status: r.status, body: (await r.text()).slice(0, 300) })),

    fetch(`${BASE}/v1/availability`, { headers: h })
      .then(async r => ({ test: "GET /v1/availability", status: r.status, body: (await r.text()).slice(0, 300) })),

    fetch(`${BASE}/v2/availability`, { headers: h })
      .then(async r => ({ test: "GET /v2/availability", status: r.status, body: (await r.text()).slice(0, 300) })),

    fetch(`${BASE}/v1/availability/${encoded}`, {
      method: "PATCH", headers: h, body: JSON.stringify({ availableQuantity: 5 }),
    }).then(async r => ({ test: `PATCH /v1/availability/${testSku}`, status: r.status, body: (await r.text()).slice(0, 300) })),

    fetch(`${BASE}/v2/availability/${encoded}`, {
      method: "PATCH", headers: h, body: JSON.stringify({ availableQuantity: 5 }),
    }).then(async r => ({ test: `PATCH /v2/availability/${testSku}`, status: r.status, body: (await r.text()).slice(0, 300) })),
  ]);

  return NextResponse.json({ scope: "availability", tests }, { headers: { "Cache-Control": "no-store" } });
}
