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

  // Variante 1: order_id (mit -A), document_type=INVOICE
  {
    const fd = new FormData();
    fd.append("file", new Blob([DUMMY_PDF], { type: "application/pdf" }), "test.pdf");
    fd.append("document_type", "INVOICE");
    const res = await fetch(`${BASE}/orders/${orderId}/documents`, {
      method: "POST", headers: authHeaders(), body: fd,
    });
    results["1_orderId_INVOICE"] = { status: res.status, body: await res.text() };
  }

  // Variante 2: commercial_id (ohne -A), document_type=INVOICE
  {
    const fd = new FormData();
    fd.append("file", new Blob([DUMMY_PDF], { type: "application/pdf" }), "test.pdf");
    fd.append("document_type", "INVOICE");
    const res = await fetch(`${BASE}/orders/${commercialId}/documents`, {
      method: "POST", headers: authHeaders(), body: fd,
    });
    results["2_commercialId_INVOICE"] = { status: res.status, body: await res.text() };
  }

  // Variante 3: order_id, kein document_type
  {
    const fd = new FormData();
    fd.append("file", new Blob([DUMMY_PDF], { type: "application/pdf" }), "test.pdf");
    const res = await fetch(`${BASE}/orders/${orderId}/documents`, {
      method: "POST", headers: authHeaders(), body: fd,
    });
    results["3_orderId_noType"] = { status: res.status, body: await res.text() };
  }

  // Variante 4: GET auf /documents um zu sehen was schon da ist
  {
    const res = await fetch(`${BASE}/orders/${orderId}/documents`, { headers: authHeaders() });
    results["4_GET_existing_docs"] = { status: res.status, body: await res.json().catch(() => "parse error") };
  }

  return NextResponse.json(results);
}
