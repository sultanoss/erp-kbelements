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

  // Korrekte Struktur: {"order_documents": [{type_code, file_name}]}
  // Problem: type_code "INVOICE" ungültig — verschiedene Codes versuchen:

  const typeCodes = [
    "SELLER_INVOICE", "MPS_INVOICE", "SHOP_INVOICE", "INVOICE_SELLER",
    "COMMERCIAL_INVOICE", "TAX_INVOICE", "ORDER_INVOICE", "INV",
    "ACCOUNTING_DOCUMENT", "BILLING", "BILL",
  ];
  for (const code of typeCodes) {
    await tryUpload(`type_${code}`, orderId, { order_documents: [{ type_code: code, file_name: "test.pdf" }] });
  }

  // Auch ohne type_code versuchen
  await tryUpload("no_type_code", orderId, { order_documents: [{ file_name: "test.pdf" }] });

  // Verfügbare Dokumenttypen von Mirakl abfragen
  const typesRes = await fetch(`${BASE}/document-types`, { headers: authHeaders() });
  results["available_doc_types"] = { status: typesRes.status, body: await typesRes.text() };

  const typesRes2 = await fetch(`${BASE}/order-documents/types`, { headers: authHeaders() });
  results["available_doc_types2"] = { status: typesRes2.status, body: await typesRes2.text() };

  return NextResponse.json(results);
}
