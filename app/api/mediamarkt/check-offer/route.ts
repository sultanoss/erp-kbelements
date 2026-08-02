import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const sku = req.nextUrl.searchParams.get("sku");
  const key = process.env.MEDIAMARKT_API_KEY;
  if (!key) return NextResponse.json({ error: "MEDIAMARKT_API_KEY fehlt" }, { status: 500 });

  const url = sku
    ? `https://mediamarktsaturn.mirakl.net/api/offers?shop_skus=${encodeURIComponent(sku)}&max=10`
    : `https://mediamarktsaturn.mirakl.net/api/offers?max=5`;

  const res = await fetch(url, {
    headers: { Authorization: key, Accept: "application/json" },
  });

  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }

  return NextResponse.json({ status: res.status, data });
}
