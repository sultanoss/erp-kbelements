import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/otto/callback`;

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.json(
      { ok: false, error: error ?? "Kein Autorisierungscode erhalten" },
      { status: 400 }
    );
  }

  const clientId = process.env.OTTO_CLIENT_ID;
  const clientSecret = process.env.OTTO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ ok: false, error: "OTTO_CLIENT_ID oder OTTO_CLIENT_SECRET fehlt" }, { status: 500 });
  }

  const res = await fetch("https://api.otto.market/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { ok: false, error: `Token-Exchange Fehler ${res.status}: ${text}` },
      { status: 500 }
    );
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  if (!data.refresh_token) {
    return NextResponse.json(
      { ok: false, error: "Kein Refresh Token in der Antwort" },
      { status: 500 }
    );
  }

  await prisma.setting.upsert({
    where: { key: "OTTO_REFRESH_TOKEN" },
    update: { value: data.refresh_token },
    create: { key: "OTTO_REFRESH_TOKEN", value: data.refresh_token },
  });

  return new NextResponse(
    `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Otto verbunden</title>
    <style>body{font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;}
    .box{background:white;border:1px solid #e5e5e5;border-radius:16px;padding:40px;max-width:400px;text-align:center;}
    h1{color:#16a34a;font-size:1.25rem;margin:0 0 8px;}p{color:#666;margin:0 0 20px;font-size:0.875rem;}
    a{display:inline-block;background:#C0182A;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:0.875rem;}
    </style></head><body>
    <div class="box">
      <div style="font-size:2rem;margin-bottom:16px">✅</div>
      <h1>Otto erfolgreich verbunden!</h1>
      <p>Der Refresh Token wurde gespeichert. Bestellungen werden ab sofort automatisch alle 5 Minuten importiert.</p>
      <a href="/bestellungen">Zu den Bestellungen</a>
    </div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
