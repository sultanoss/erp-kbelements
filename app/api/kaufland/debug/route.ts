import { auth } from "@/auth";
import { createHmac } from "crypto";

function signedHeaders(method: string, fullUrl: string, bodyStr: string): Record<string, string> {
  const clientKey = process.env.KAUFLAND_CLIENT_KEY ?? "";
  const secretKey = process.env.KAUFLAND_SECRET_KEY ?? "";
  const timestamp = Math.floor(Date.now() / 1000);
  const msg = [method.toUpperCase(), fullUrl, bodyStr, String(timestamp)].join("\n");
  const sig = createHmac("sha256", secretKey).update(msg).digest("hex");
  return {
    "Shop-Client-Key": clientKey,
    "Shop-Timestamp": String(timestamp),
    "Shop-Signature": sig,
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "kbelements-erp/1.0",
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");

  const BASE = "https://sellerapi.kaufland.com/v2";

  if (orderId) {
    const url = `${BASE}/orders/${orderId}`;
    const res = await fetch(url, { headers: signedHeaders("GET", url, "") });
    const data = await res.json();
    return Response.json(data);
  }

  // Ohne orderId: erste Seite der offenen Bestellungen
  const sf = process.env.KAUFLAND_STOREFRONT ?? "de";
  const url = `${BASE}/orders?storefront=${sf}&status=need_to_be_sent&limit=3&offset=0`;
  const res = await fetch(url, { headers: signedHeaders("GET", url, "") });
  const data = await res.json();
  return Response.json(data);
}
