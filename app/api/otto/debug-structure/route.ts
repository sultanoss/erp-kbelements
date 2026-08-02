import { NextResponse } from "next/server";

const TOKEN_URL = "https://api.otto.market/oauth2/token";

async function getToken(scope: string): Promise<string | null> {
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
  const data = await res.json() as { access_token?: string };
  return data.access_token ?? null;
}

export async function GET() {
  const scopes = ["", "availability", "orders", "shipments", "receipts", "returns"];
  const results = [];

  for (const scope of scopes) {
    const token = await getToken(scope);
    if (!token) { results.push({ scope: scope || "(kein)", tokenOk: false }); continue; }

    const r = await fetch("https://api.otto.market/v2/products?productLifeCycle=ACTIVE&limit=1", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const raw = await r.text();
    results.push({ scope: scope || "(kein)", tokenOk: true, status: r.status, snippet: raw.slice(0, 200) });
  }

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
}
