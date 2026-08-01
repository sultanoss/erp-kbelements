export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return new Response("Fehlender code-Parameter", { status: 400 });
  }

  const clientId = (process.env.EBAY_CLIENT_ID ?? "").replace(/^﻿/, "").trim();
  const clientSecret = (process.env.EBAY_CLIENT_SECRET ?? "").replace(/^﻿/, "").trim();
  const ruName = (process.env.EBAY_OUTLET_RUNAME ?? "").replace(/^﻿/, "").trim();

  if (!clientId || !clientSecret || !ruName) {
    return new Response("eBay-Outlet-Konfiguration unvollständig", { status: 500 });
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenRes = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: ruName,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return new Response(`Token-Austausch fehlgeschlagen: ${tokenRes.status} ${text}`, { status: 500 });
  }

  const data = (await tokenRes.json()) as { access_token?: string; refresh_token?: string; error?: string };

  if (!data.refresh_token) {
    return new Response(`Kein refresh_token erhalten: ${JSON.stringify(data)}`, { status: 500 });
  }

  // Automatisch in Vercel speichern
  let vercelOk = false;
  try {
    const vercelToken = process.env.VERCEL_API_TOKEN;
    const teamId = process.env.VERCEL_TEAM_ID;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const envId = "B9yltTcGYZWf2oWE"; // EBAY_OUTLET_REFRESH_TOKEN

    if (vercelToken && teamId && projectId) {
      const patchRes = await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/env/${envId}?teamId=${teamId}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ value: data.refresh_token }),
        }
      );
      if (patchRes.ok) {
        await fetch(`https://api.vercel.com/v13/deployments?teamId=${teamId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "erp-kbelements", projectId, target: "production" }),
        });
        vercelOk = true;
      }
    }
  } catch { /* ignore */ }

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><title>eBay Outlet verbunden</title>
<style>body{font-family:monospace;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:2rem;max-width:600px;width:100%}
h1{color:#16a34a;font-size:1rem;margin:0 0 1rem}
.ok{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:0.75rem;font-size:0.8rem;color:#15803d;margin:1rem 0}
.token{background:#f5f5f5;border:1px solid #e5e5e5;border-radius:4px;padding:1rem;word-break:break-all;font-size:0.75rem;margin:1rem 0}
.step{margin:0.5rem 0;font-size:0.8rem;color:#555}</style>
</head>
<body>
<div class="box">
  <h1>&#10003; eBay Outlet erfolgreich verbunden!</h1>
  ${vercelOk
    ? `<div class="ok">&#10003; Token wurde automatisch in Vercel gespeichert und Redeploy gestartet.</div>`
    : `<p class="step">Token manuell als <strong>EBAY_OUTLET_REFRESH_TOKEN</strong> in Vercel eintragen:</p><div class="token">${data.refresh_token}</div>`
  }
</div>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
