import { NextResponse } from "next/server";

export async function GET() {
  const clientId = (process.env.EBAY_CLIENT_ID ?? "").replace(/^﻿/, "").trim();
  const ruName = (process.env.EBAY_RUNAME ?? "").replace(/^﻿/, "").trim();

  if (!clientId || !ruName) {
    return new Response("EBAY_CLIENT_ID oder EBAY_RUNAME nicht konfiguriert", { status: 500 });
  }

  const url = new URL("https://auth.ebay.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", ruName);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://api.ebay.com/oauth/api_scope/sell.fulfillment");
  url.searchParams.set("prompt", "login");

  return NextResponse.redirect(url.toString());
}
