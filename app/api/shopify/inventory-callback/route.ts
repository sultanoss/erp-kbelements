import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const store = (process.env.SHOPIFY_STORE ?? "").replace(/^﻿/, "").trim();
  const clientId = (process.env.SHOPIFY_INVENTORY_CLIENT_ID ?? "").replace(/^﻿/, "").trim();
  const clientSecret = (process.env.SHOPIFY_INVENTORY_CLIENT_SECRET ?? "").replace(/^﻿/, "").trim();

  if (!code) return new Response("Kein Code erhalten", { status: 400 });

  const tokenRes = await fetch(`https://${store}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  const tokenData = await tokenRes.json() as { access_token?: string; scope?: string; error?: string };

  if (!tokenData.access_token) {
    return new Response(`Fehler: ${JSON.stringify(tokenData)}`, { status: 400 });
  }

  return new Response(`
    <!DOCTYPE html>
    <html><body style="font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px">
      <h2>✅ Shopify Inventory Token</h2>
      <p>Scopes: <code>${tokenData.scope}</code></p>
      <p>Token als <strong>SHOPIFY_INVENTORY_TOKEN</strong> in Vercel speichern:</p>
      <code style="background:#f0f0f0;padding:12px;display:block;word-break:break-all;border-radius:4px">${tokenData.access_token}</code>
    </body></html>
  `, { headers: { "Content-Type": "text/html" } });
}
