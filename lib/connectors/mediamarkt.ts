import type { NormalizedOrder } from "./otto";

const BASE = "https://mediamarktsaturn.mirakl.net/api";

const ISO3_TO_2: Record<string, string> = {
  DEU: "DE", AUT: "AT", FRA: "FR", CHE: "CH", NLD: "NL",
  BEL: "BE", POL: "PL", ITA: "IT", ESP: "ES",
};

function iso2(code: string | undefined): string {
  if (!code) return "DE";
  return ISO3_TO_2[code] ?? (code.length === 2 ? code : "DE");
}

function miraklPhone(...addrs: Array<Record<string, unknown> | null | undefined>): string | undefined {
  for (const a of addrs) {
    if (!a) continue;
    const v = a["phone"] ?? a["phone_number"] ?? a["cell_phone"] ?? a["mobile_phone"];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

function authHeaders(): Record<string, string> {
  const key = process.env.MEDIAMARKT_API_KEY;
  if (!key) throw new Error("MEDIAMARKT_API_KEY nicht konfiguriert");
  return { Authorization: key, Accept: "application/json" };
}

type MiraklAddress = {
  firstname?: string;
  lastname?: string;
  street_1?: string;
  street_2?: string;
  city?: string;
  zip_code?: string;
  country_iso_code?: string;
  phone?: string;
};

type MiraklOrderLine = {
  order_line_id?: string;
  offer_sku?: string;
  product_title?: string;
  quantity?: number;
  price_unit?: number;
};

type MiraklOrder = {
  order_id: string;
  commercial_id?: string;
  created_date?: string;
  customer?: {
    firstname?: string;
    lastname?: string;
    shipping_address?: MiraklAddress;
    billing_address?: MiraklAddress;
  };
  order_lines?: MiraklOrderLine[];
};

export async function fetchMediaMarktOrders(fromIso?: string): Promise<NormalizedOrder[]> {
  const orders: NormalizedOrder[] = [];
  let offset = 0;
  const max = 100;

  while (true) {
    const url = `${BASE}/orders?order_state_codes=SHIPPING&max=${max}&offset=${offset}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MediaMarkt Orders-Fehler ${res.status}: ${text}`);
    }

    const data = await res.json() as { orders?: MiraklOrder[] };
    const page = data.orders ?? [];
    if (page.length === 0) break;

    let hitOldOrder = false;
    for (const o of page) {
      if (fromIso && o.created_date && o.created_date < fromIso) {
        hitOldOrder = true;
        break;
      }

      // Adressen liegen unter customer.shipping_address / customer.billing_address
      const sa = o.customer?.shipping_address ?? {};
      const ba = o.customer?.billing_address;

      const customerName =
        [sa.firstname, sa.lastname].filter(Boolean).join(" ") ||
        [o.customer?.firstname, o.customer?.lastname].filter(Boolean).join(" ") ||
        "Unbekannt";

      orders.push({
        externalId: o.order_id,
        orderNumber: o.commercial_id,
        marketplace: "MEDIAMARKT",
        orderDate: new Date(o.created_date ?? new Date().toISOString()),
        customerName,
        street: [sa.street_1, sa.street_2].filter(Boolean).join(" "),
        zip: sa.zip_code ?? "",
        city: sa.city ?? "",
        country: iso2(sa.country_iso_code),
        billingName: ba
          ? [ba.firstname, ba.lastname].filter(Boolean).join(" ") || undefined
          : undefined,
        billingStreet: ba
          ? [ba.street_1, ba.street_2].filter(Boolean).join(" ") || undefined
          : undefined,
        billingZip: ba?.zip_code,
        billingCity: ba?.city,
        billingCountry: ba ? iso2(ba.country_iso_code) : undefined,
        phoneNumber: miraklPhone(
          sa as unknown as Record<string, unknown>,
          ba as unknown as Record<string, unknown>,
          o.customer as unknown as Record<string, unknown>,
        ),
        items: (o.order_lines ?? []).map((line) => ({
          marketplaceSku: line.offer_sku ?? "UNKNOWN",
          positionItemId: line.order_line_id,
          title: line.product_title ?? line.offer_sku ?? "Artikel",
          quantity: line.quantity ?? 1,
          price: line.price_unit ?? 0,
        })),
      });
    }

    if (hitOldOrder || page.length < max) break;
    offset += max;
  }

  return orders;
}

export async function sendMediaMarktShipmentNotification(params: {
  orderId: string;
  trackingNumber: string;
  carrier: "DHL" | "GEL";
  orderLineIds?: string[];
}): Promise<void> {
  const carrierName = params.carrier === "DHL" ? "DHL" : "GEL Express";
  const carrierUrl = params.carrier === "DHL"
    ? `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${params.trackingNumber}`
    : `https://www.gel-express.de/de/sendungsverfolgung`;

  // OR23: Tracking-Daten übermitteln (PUT /tracking)
  const or23Res = await fetch(`${BASE}/orders/${params.orderId}/tracking`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      carrier_name: carrierName,
      tracking_number: params.trackingNumber,
      carrier_url: carrierUrl,
    }),
  });
  if (!or23Res.ok) {
    const text = await or23Res.text();
    if (or23Res.status === 400 || or23Res.status === 409) {
      const lower = text.toLowerCase();
      if (lower.includes("already") || lower.includes("shipped") || lower.includes("state")) {
        // Bereits gemeldet → direkt zu OR24
      } else {
        throw new Error(`MediaMarkt OR23 Fehler ${or23Res.status}: ${text}`);
      }
    } else {
      throw new Error(`MediaMarkt OR23 Fehler ${or23Res.status}: ${text}`);
    }
  }

  // OR24: Versand bestätigen (PUT /ship — kein Body)
  const or24Res = await fetch(`${BASE}/orders/${params.orderId}/ship`, {
    method: "PUT",
    headers: authHeaders(),
  });
  if (!or24Res.ok) {
    const text = await or24Res.text();
    if (or24Res.status === 400 || or24Res.status === 409) {
      const lower = text.toLowerCase();
      if (lower.includes("already") || lower.includes("shipped") || lower.includes("state")) return;
    }
    throw new Error(`MediaMarkt OR24 Fehler ${or24Res.status}: ${text}`);
  }
}

export type MediaMarktInventorySku = { marketplaceSku: string; title: string | null };
export type MediaMarktStockPushResult = { marketplaceSku: string; ok: boolean; error?: string };

export async function fetchMediaMarktSkus(): Promise<MediaMarktInventorySku[]> {
  const skus: MediaMarktInventorySku[] = [];
  let offset = 0;
  const max = 100;

  while (true) {
    const url = `${BASE}/offers?max=${max}&offset=${offset}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) break;
    const data = await res.json() as {
      offers?: Array<{ shop_sku?: string; offer_sku?: string; product_title?: string }>;
      total_count?: number;
    };
    const page = data.offers ?? [];
    for (const o of page) {
      const sku = o.shop_sku ?? o.offer_sku;
      if (sku) skus.push({ marketplaceSku: sku, title: o.product_title ?? null });
    }
    const total = data.total_count ?? 0;
    offset += page.length;
    if (offset >= total || page.length === 0) break;
  }

  return skus;
}

export async function pushMediaMarktStock(
  items: Array<{ marketplaceSku: string; quantity: number }>
): Promise<MediaMarktStockPushResult[]> {
  // Mirakl Offers Import
  const lines = ["shop-sku;quantity", ...items.map((i) => `${i.marketplaceSku};${i.quantity}`)];
  const csv = lines.join("\n");

  const formData = new FormData();
  formData.append("file", new Blob([csv], { type: "text/csv" }), "stock.csv");

  const res = await fetch(`${BASE}/offers/imports?import_mode=PARTIAL_UPDATE`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  const responseText = await res.text();

  if (!res.ok) {
    return items.map((i) => ({ marketplaceSku: i.marketplaceSku, ok: false, error: `${res.status}: ${responseText.slice(0, 500)}` }));
  }

  // Mirakl verarbeitet Imports asynchron — auf Ergebnis warten
  let importId: number | undefined;
  try {
    const data = JSON.parse(responseText) as { import_id?: number };
    importId = data.import_id;
  } catch { /* kein JSON */ }

  if (!importId) {
    return items.map((i) => ({ marketplaceSku: i.marketplaceSku, ok: false, error: `Kein import_id in Antwort: ${responseText.slice(0, 200)}` }));
  }

  // Bis zu 30 Sek. auf Verarbeitung warten
  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(`${BASE}/offers/imports/${importId}`, { headers: authHeaders() });
    if (!statusRes.ok) break;
    const status = await statusRes.json() as { import_status?: string; has_error_report?: boolean; lines_read?: number; lines_in_success?: number; lines_in_error?: number };

    if (status.import_status === "COMPLETE" || status.import_status === "FAILED" || status.has_error_report) {
      if (status.has_error_report) {
        const reportRes = await fetch(`${BASE}/offers/imports/${importId}/tracking_report`, { headers: authHeaders() });
        const reportText = await reportRes.text();
        return items.map((i) => ({ marketplaceSku: i.marketplaceSku, ok: false, error: `Import #${importId}: ${reportText.slice(0, 300)}` }));
      }
      // Erfolgreich
      return items.map((i) => ({ marketplaceSku: i.marketplaceSku, ok: true }));
    }
  }

  // Timeout — Import wurde angenommen aber Status unklar
  return items.map((i) => ({ marketplaceSku: i.marketplaceSku, ok: false, error: `Import #${importId} läuft noch — Status unklar nach 30s` }));
}

export async function uploadMediaMarktInvoice(
  orderId: string,
  pdfBytes: Uint8Array,
  filename: string,
): Promise<void> {
  const formData = new FormData();
  formData.append("files", new Blob([Buffer.from(pdfBytes)], { type: "application/pdf" }), filename);
  formData.append(
    "order_documents",
    JSON.stringify({ order_documents: [{ type_code: "CUSTOMER_INVOICE", file_name: filename }] }),
  );

  const res = await fetch(`${BASE}/orders/${orderId}/documents`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MediaMarkt OR74 Fehler ${res.status}: ${text}`);
  }

  const data = await res.json() as { errors_count?: number; order_documents?: Array<{ errors?: Array<{ message: string }> }> };
  if ((data.errors_count ?? 0) > 0) {
    const msg = data.order_documents?.[0]?.errors?.map((e) => e.message).join(", ") ?? "Unbekannter Fehler";
    throw new Error(`MediaMarkt OR74 Fehler: ${msg}`);
  }
}
