import { NextResponse } from "next/server";

const BASE = "https://mediamarktsaturn.mirakl.net/api";

function authHeaders(): Record<string, string> {
  const key = process.env.MEDIAMARKT_API_KEY;
  if (!key) throw new Error("MEDIAMARKT_API_KEY nicht konfiguriert");
  return { Authorization: key, Accept: "application/json" };
}

const DUMMY_PDF = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10]); // %PDF-1.4\n

export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("orderId") ?? "01125_319923129-A";
  const commercialId = orderId.replace(/-A$/, "");
  const results: Record<string, unknown> = { orderId, commercialId };

  async function tryUpload(label: string, id: string, orderDocs: unknown) {
    const fd = new FormData();
    fd.append("files", new Blob([DUMMY_PDF], { type: "application/pdf" }), "test.pdf");
    fd.append("order_documents", JSON.stringify(orderDocs));
    const res = await fetch(`${BASE}/orders/${id}/documents`, {
      method: "POST", headers: authHeaders(), body: fd,
    });
    results[label] = { status: res.status, body: await res.text() };
  }

  // 1. CUSTOMER_INVOICE — aus offizieller Mirakl OR74 Doku
  await tryUpload("1_CUSTOMER_INVOICE", orderId,
    { order_documents: [{ type_code: "CUSTOMER_INVOICE", file_name: "test.pdf" }] });

  // 2. OR72: Bereits hochgeladene Dokumente abrufen (verschiedene Pfade)
  for (const [label, path] of [
    ["OR72_order_docs", `/orders/${orderId}/documents`],
    ["OR72_commercial_docs", `/orders/${commercialId}/documents`],
    ["OR72_v2_path", `/orders/${orderId}/documents?max=10`],
  ] as [string, string][]) {
    const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
    const body = res.status !== 405
      ? await res.json().catch(() => res.text())
      : "405 Method Not Allowed";
    results[label] = { status: res.status, body };
  }

  // 3. Dokumenttypen-Liste (alle Varianten)
  for (const [label, path] of [
    ["types_order_document_types", "/orders/documents/types"],
    ["types_config", "/configuration/order-document-types"],
    ["types_v2", "/order-document-types"],
    ["types_settings", "/settings/order-document-types"],
  ] as [string, string][]) {
    const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
    results[label] = { status: res.status, body: await res.text() };
  }

  return NextResponse.json(results);
}
