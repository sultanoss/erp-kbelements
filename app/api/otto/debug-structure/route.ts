import { NextResponse } from "next/server";

const TOKEN_URL = "https://api.otto.market/oauth2/token";

export async function GET() {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.OTTO_CLIENT_ID!,
      client_secret: process.env.OTTO_CLIENT_SECRET!,
    }),
  });
  const { access_token } = await res.json() as { access_token: string };

  const r = await fetch("https://api.otto.market/v2/products?productLifeCycle=ACTIVE&limit=2", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const data = await r.json() as { resources?: unknown[] };

  // Return raw first 2 products so we can see all fields
  return NextResponse.json({ first2: data.resources?.slice(0, 2) }, { headers: { "Cache-Control": "no-store" } });
}
