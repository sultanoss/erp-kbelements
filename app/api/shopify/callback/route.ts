export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");

  if (!code || !shop) {
    return new Response("Fehlende Parameter (code, shop)", { status: 400 });
  }

  const store = (process.env.SHOPIFY_STORE ?? "").replace(/^﻿/, "").trim();
  const clientId = (process.env.SHOPIFY_CLIENT_ID ?? "").replace(/^﻿/, "").trim();
  const clientSecret = (process.env.SHOPIFY_CLIENT_SECRET ?? "").replace(/^﻿/, "").trim();

  if (!store || !clientId || !clientSecret) {
    return new Response("Shopify-Konfiguration unvollständig", { status: 500 });
  }

  const tokenRes = await fetch(`https://${store}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return new Response(`Token-Austausch fehlgeschlagen: ${tokenRes.status} ${text}`, { status: 500 });
  }

  const data = await tokenRes.json() as { access_token?: string; error?: string };

  if (!data.access_token) {
    return new Response(`Kein access_token erhalten: ${JSON.stringify(data)}`, { status: 500 });
  }

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><title>Shopify verbunden</title>
<style>body{font-family:monospace;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:2rem;max-width:600px;width:100%}
h1{color:#16a34a;font-size:1rem;margin:0 0 1rem}
.token{background:#f5f5f5;border:1px solid #e5e5e5;border-radius:4px;padding:1rem;word-break:break-all;font-size:0.75rem;margin:1rem 0}
.step{margin:0.5rem 0;font-size:0.8rem;color:#555}
.warning{color:#c0182a;font-size:0.75rem;margin-top:1rem}</style>
</head>
<body>
<div class="box">
  <h1>&#10003; Shopify erfolgreich verbunden!</h1>
  <p class="step">Trage diesen Token als <strong>SHOPIFY_ACCESS_TOKEN</strong> in Vercel ein:</p>
  <div class="token">${data.access_token}</div>
  <p class="step">1. Vercel Dashboard → Projekt erp-kbelements → Settings → Environment Variables</p>
  <p class="step">2. SHOPIFY_ACCESS_TOKEN = Wert oben</p>
  <p class="step">3. Neu deployen</p>
  <p class="warning">&#9888; Dieser Token wird nur einmal angezeigt. Kopiere ihn jetzt!</p>
</div>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
