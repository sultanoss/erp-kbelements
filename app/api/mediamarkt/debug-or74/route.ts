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

  // Variante 1: Array mit type_code=INVOICE, orderId
  await tryUpload("1_array_type_code", orderId, [{ type_code: "INVOICE", file_name: "test.pdf" }]);

  // Variante 2: Array mit type_code=INVOICE, commercialId
  await tryUpload("2_array_type_code_commercial", commercialId, [{ type_code: "INVOICE", file_name: "test.pdf" }]);

  // Variante 3: Objekt statt Array
  await tryUpload("3_object_type_code", orderId, { type_code: "INVOICE", file_name: "test.pdf" });

  // Variante 4: type statt type_code
  await tryUpload("4_type_field", orderId, [{ type: "INVOICE", file_name: "test.pdf" }]);

  // Variante 5: document_type Feld
  await tryUpload("5_document_type_field", orderId, [{ document_type: "INVOICE", file_name: "test.pdf" }]);

  // Variante 6: Kein Typ, nur Dateiname
  await tryUpload("6_no_type", orderId, [{ file_name: "test.pdf" }]);

  return NextResponse.json(results);
}
