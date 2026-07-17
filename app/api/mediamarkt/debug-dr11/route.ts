import { NextResponse } from "next/server";

const BASE = "https://mediamarktsaturn.mirakl.net/api";

function authHeaders(): Record<string, string> {
  const key = process.env.MEDIAMARKT_API_KEY;
  if (!key) throw new Error("MEDIAMARKT_API_KEY nicht konfiguriert");
  return { Authorization: key, Accept: "application/json" };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const orderId = new URL(request.url).searchParams.get("orderId") ?? "01125_319923129-A";

  // Alle States abfragen (kein state-Filter)
  const allRes = await fetch(
    `${BASE}/document-request/requests?entity_id=${encodeURIComponent(orderId)}&entity_type=PRODUCT_LOGISTIC_ORDER&issuer_type=SHOP`,
    { headers: authHeaders() },
  );
  const allData = await allRes.json();

  // Nur TO_PROCESS abfragen
  const toProcessRes = await fetch(
    `${BASE}/document-request/requests?entity_id=${encodeURIComponent(orderId)}&entity_type=PRODUCT_LOGISTIC_ORDER&issuer_type=SHOP&state=TO_PROCESS`,
    { headers: authHeaders() },
  );
  const toProcessData = await toProcessRes.json();

  // Auch commercial_id (ohne -A) versuchen
  const commercialId = orderId.replace(/-A$/, "");
  const commercialRes = await fetch(
    `${BASE}/document-request/requests?entity_id=${encodeURIComponent(commercialId)}&entity_type=PRODUCT_LOGISTIC_ORDER&issuer_type=SHOP`,
    { headers: authHeaders() },
  );
  const commercialData = await commercialRes.json();

  return NextResponse.json({
    orderId,
    commercialId,
    allRequests: { status: allRes.status, data: allData },
    toProcessOnly: { status: toProcessRes.status, data: toProcessData },
    withCommercialId: { status: commercialRes.status, data: commercialData },
  });
}
