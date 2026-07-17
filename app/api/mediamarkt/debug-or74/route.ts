import { NextResponse } from "next/server";

const BASE = "https://mediamarktsaturn.mirakl.net/api";

function authHeaders(): Record<string, string> {
  const key = process.env.MEDIAMARKT_API_KEY;
  if (!key) throw new Error("MEDIAMARKT_API_KEY nicht konfiguriert");
  return { Authorization: key, Accept: "application/json" };
}

// Lädt eine Mini-PDF (1 Byte) hoch um den Endpunkt zu testen ohne echte Rechnung
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

  // Lowercase und weitere Varianten von INVOICE
  const moreCodes = [
    "invoice", "Invoice", "RECHNUNG", "rechnung",
    "INVOICE_DOCUMENT", "DOCUMENT", "OTHER", "other",
    "MISC", "ATTACHMENT", "PDF",
  ];
  for (const code of moreCodes) {
    await tryUpload(`type_${code}`, orderId, { order_documents: [{ type_code: code, file_name: "test.pdf" }] });
  }

  // Verschiedene API-Pfade für Dokumenttypen
  for (const path of [
    "/orders/documents/types",
    "/configuration/order-document-types",
    "/configuration/document-types",
    "/order-document-types",
  ]) {
    const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
    results[`GET_${path}`] = { status: res.status, body: await res.text().catch(() => "err") };
  }

  // Alle vorhandenen Dokumente dieser Bestellung abrufen (andere Methoden)
  const patchRes = await fetch(`${BASE}/orders/${orderId}/documents`, {
    method: "PATCH", headers: authHeaders(),
  });
  results["PATCH_docs_405check"] = { status: patchRes.status };

  return NextResponse.json(results);
}
