import { createHmac } from "crypto";
import type { NormalizedOrder } from "./otto";

const BASE = "https://sellerapi.kaufland.com/v2";

function signedHeaders(method: string, fullUrl: string, bodyStr: string): Record<string, string> {
  const clientKey = process.env.KAUFLAND_CLIENT_KEY ?? "";
  const secretKey = process.env.KAUFLAND_SECRET_KEY ?? "";
  if (!clientKey || !secretKey) throw new Error("KAUFLAND_CLIENT_KEY oder KAUFLAND_SECRET_KEY fehlt");

  const timestamp = Math.floor(Date.now() / 1000);
  const msg = [method.toUpperCase(), fullUrl, bodyStr, String(timestamp)].join("\n");
  const sig = createHmac("sha256", secretKey).update(msg).digest("hex");

  return {
    "Shop-Client-Key": clientKey,
    "Shop-Timestamp": String(timestamp),
    "Shop-Signature": sig,
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "kbelements-erp/1.0",
  };
}

// Response vom Listen-Endpoint: nur Metadaten, KEINE Adress-/Käuferdaten
type KauflandOrderListItem = {
  id_order: string;
  ts_created_iso?: string;
  order_units_count?: number;
};

// Response vom Detail-Endpoint: alle Käufer- und Adressdaten
type KauflandOrderDetail = {
  id_order: string;
  id_purchase?: string | number;
  ts_created_iso?: string;
  buyer?: { firstname?: string; lastname?: string; phone?: string };
  shipping_address?: {
    firstname?: string; lastname?: string;
    street?: string; house_number?: string;
    postcode?: string; city?: string; country?: string;
  };
  billing_address?: {
    firstname?: string; lastname?: string;
    street?: string; house_number?: string;
    postcode?: string; city?: string; country?: string;
  };
};

// fromIso: ISO-Timestamp ab dem importiert wird, z.B. "2026-07-16T00:00:00Z"
// API liefert Bestellungen absteigend (neueste zuerst) → frühzeitiger Abbruch möglich
export async function fetchKauflandOrders(fromIso?: string): Promise<NormalizedOrder[]> {
  const storefront = process.env.KAUFLAND_STOREFRONT ?? "de";
  const orders: NormalizedOrder[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${BASE}/orders?storefront=${storefront}&status=need_to_be_sent&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers: signedHeaders("GET", url, "") });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Kaufland Orders-Fehler ${res.status}: ${text}`);
    }

    const data = await res.json() as { data?: KauflandOrderListItem[]; pagination?: { total: number } };
    const page = data.data ?? [];
    if (page.length === 0) break;

    let hitOldOrder = false;
    for (const o of page) {
      // Frühzeitiger Abbruch: ältere Bestellung als fromIso → Rest ebenfalls älter
      if (fromIso && o.ts_created_iso && o.ts_created_iso < fromIso) {
        hitOldOrder = true;
        break;
      }

      // Detailaufruf: Käufer + Adressen (nicht im Listen-Endpoint enthalten)
      const detailUrl = `${BASE}/orders/${o.id_order}`;
      const detailRes = await fetch(detailUrl, { headers: signedHeaders("GET", detailUrl, "") });
      const detail: KauflandOrderDetail = detailRes.ok
        ? ((await detailRes.json() as { data?: KauflandOrderDetail }).data ?? { id_order: o.id_order })
        : { id_order: o.id_order };

      // Order-Units: Artikel, SKU, Preis
      const unitsUrl = `${BASE}/order-units?storefront=${storefront}&id_order=${o.id_order}&limit=100`;
      const unitsRes = await fetch(unitsUrl, { headers: signedHeaders("GET", unitsUrl, "") });
      if (!unitsRes.ok) continue;

      const unitsData = await unitsRes.json() as {
        data?: Array<{
          id_order_unit: string | number;
          offer_sku?: string;              // Seller-eigene SKU (primär)
          id_product_variant?: string | number; // Kaufland-interne ID
          ean?: string;                    // EAN-Fallback
          title?: string;
          unit_price?: number;
        }>;
      };

      const sa = detail.shipping_address ?? {};
      const ba = detail.billing_address;

      const customerName = [
        sa.firstname ?? detail.buyer?.firstname,
        sa.lastname ?? detail.buyer?.lastname,
      ].filter(Boolean).join(" ") || "Unbekannt";

      orders.push({
        externalId: String(o.id_order),
        orderNumber: detail.id_purchase != null
          ? String(detail.id_purchase)
          : String(o.id_order),
        marketplace: "KAUFLAND",
        orderDate: new Date(o.ts_created_iso ?? detail.ts_created_iso ?? new Date().toISOString()),
        customerName,
        street: [sa.street, sa.house_number].filter(Boolean).join(" "),
        zip: sa.postcode ?? "",
        city: sa.city ?? "",
        country: sa.country ?? "DE",
        billingName: ba ? [ba.firstname, ba.lastname].filter(Boolean).join(" ") : undefined,
        billingStreet: ba ? [ba.street, ba.house_number].filter(Boolean).join(" ") : undefined,
        billingZip: ba?.postcode,
        billingCity: ba?.city,
        billingCountry: ba?.country,
        phoneNumber: detail.buyer?.phone,
        items: (unitsData.data ?? []).map((u) => ({
          marketplaceSku: String(u.offer_sku ?? u.ean ?? u.id_product_variant ?? "UNKNOWN"),
          positionItemId: String(u.id_order_unit),
          title: u.title ?? String(u.offer_sku ?? u.id_product_variant ?? "Artikel"),
          quantity: 1,
          price: u.unit_price ?? 0,
        })),
      });
    }

    if (hitOldOrder || page.length < limit) break;
    offset += limit;
  }

  return orders;
}

export async function sendKauflandShipmentNotification(params: {
  orderUnitIds: string[];
  trackingNumber: string;
  carrier: "DHL" | "GEL";
}): Promise<void> {
  const carrierCode = params.carrier === "DHL" ? "dhl" : "gls";

  for (const unitId of params.orderUnitIds) {
    const url = `${BASE}/order-units/${unitId}/send`;
    const bodyObj = { tracking_numbers: params.trackingNumber, carrier_code: carrierCode };
    const bodyStr = JSON.stringify(bodyObj);

    const res = await fetch(url, {
      method: "POST",
      headers: signedHeaders("POST", url, bodyStr),
      body: bodyStr,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Kaufland Versandmeldung Fehler ${res.status} (unit ${unitId}): ${text}`);
    }
  }
}

export async function uploadKauflandInvoice(
  idOrder: string,
  pdfBytes: Uint8Array,
  filename: string,
): Promise<void> {
  const url = `${BASE}/orders/${idOrder}/invoices`;
  const bodyObj = {
    original_name: filename,
    mime_type: "application/pdf",
    data: Buffer.from(pdfBytes).toString("base64"),
  };
  const bodyStr = JSON.stringify(bodyObj);

  const res = await fetch(url, {
    method: "POST",
    headers: signedHeaders("POST", url, bodyStr),
    body: bodyStr,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kaufland Rechnungsupload Fehler ${res.status}: ${text}`);
  }
}
