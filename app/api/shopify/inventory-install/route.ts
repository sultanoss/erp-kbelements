import { NextResponse } from "next/server";

export async function GET() {
  const store = (process.env.SHOPIFY_STORE ?? "").replace(/^﻿/, "").trim();
  const clientId = (process.env.SHOPIFY_INVENTORY_CLIENT_ID ?? "").replace(/^﻿/, "").trim();

  if (!store || !clientId) {
    return new Response("SHOPIFY_STORE oder SHOPIFY_INVENTORY_CLIENT_ID nicht konfiguriert", { status: 500 });
  }

  const redirectUri = "https://erp-kbelements-sultanoss-projects.vercel.app/api/shopify/inventory-callback";

  const url = new URL(`https://${store}/admin/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", "read_products,read_inventory,write_inventory");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("grant_options[]", "offline");

  return NextResponse.redirect(url.toString());
}
