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
  const token = await getToken("availability");
  if (!token) return NextResponse.json({ error: "kein Token" });

  const r = await fetch("https://api.otto.market/v1/availability/quantities?limit=5", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const raw = await r.text();
  return NextResponse.json({ status: r.status, body: raw.slice(0, 2000) }, { headers: { "Cache-Control": "no-store" } });
}
