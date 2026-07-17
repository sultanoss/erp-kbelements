import { NextResponse } from "next/server";

const BASE = "https://mediamarktsaturn.mirakl.net/api";

function authHeaders(): Record<string, string> {
  const key = process.env.MEDIAMARKT_API_KEY;
  if (!key) throw new Error("MEDIAMARKT_API_KEY nicht konfiguriert");
  return { Authorization: key, Accept: "application/json" };
}

export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("orderId") ?? "01125_319923129-A";
  const commercialId = orderId.replace(/-A$/, "");

  async function dr11(params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE}/document-request/requests?${qs}`, { headers: authHeaders() });
    return { status: res.status, data: await res.json() };
  }

  const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
    dr11({ entity_id: orderId, entity_type: "PRODUCT_LOGISTIC_ORDER", issuer_type: "SHOP" }),
    dr11({ entity_id: orderId, entity_type: "PRODUCT_LOGISTIC_ORDER" }),
    dr11({ entity_id: commercialId, entity_type: "COMMERCIAL_ORDER", issuer_type: "SHOP" }),
    dr11({ entity_id: commercialId, entity_type: "COMMERCIAL_ORDER" }),
    dr11({ entity_id: orderId }),
    dr11({ entity_id: commercialId }),
    dr11({ state: "TO_PROCESS", issuer_type: "SHOP" }),
  ]);

  return NextResponse.json({
    orderId,
    commercialId,
    "1_PRODUCT_LOGISTIC+SHOP": r1,
    "2_PRODUCT_LOGISTIC_noIssuer": r2,
    "3_COMMERCIAL_ORDER+SHOP": r3,
    "4_COMMERCIAL_ORDER_noIssuer": r4,
    "5_noType_orderId": r5,
    "6_noType_commercialId": r6,
    "7_allOpenInShop": r7,
  });
}
