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

  // Basis: Objekt-Format hat "size mismatch" ergeben — Varianten davon:

  // V1: Objekt mit file_names (Plural)
  await tryUpload("1_obj_file_names_plural", orderId, { type_code: "INVOICE", file_names: ["test.pdf"] });

  // V2: Objekt mit files-Array innen
  await tryUpload("2_obj_files_array", orderId, { type_code: "INVOICE", files: [{ file_name: "test.pdf" }] });

  // V3: Wrapper-Objekt mit order_documents-Array
  await tryUpload("3_wrapper_array", orderId, { order_documents: [{ type_code: "INVOICE", file_name: "test.pdf" }] });

  // V4: Array mit file_names (Plural)
  await tryUpload("4_array_file_names_plural", orderId, [{ type_code: "INVOICE", file_names: ["test.pdf"] }]);

  // V5: Objekt nur mit type_code (kein file_name)
  await tryUpload("5_obj_no_filename", orderId, { type_code: "INVOICE" });

  // V6: Array nur mit type_code
  await tryUpload("6_array_no_filename", orderId, [{ type_code: "INVOICE" }]);

  // V7: Objekt mit "name" statt "file_name"
  await tryUpload("7_obj_name_field", orderId, { type_code: "INVOICE", name: "test.pdf" });

  return NextResponse.json(results);
}
