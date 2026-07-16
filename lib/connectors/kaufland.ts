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

// Nur Metadaten — keine Adressen, keine Units
type KauflandOrderListItem = {
  id_order: string;
  ts_created_iso?: string;
  order_units_count?: number;
};

// Detail-Response enthält Adressen + eingebettete order_units
type KauflandOrderUnit = {
  id_order_unit: string | number;
  id_offer?: string;       // Seller-Angebots-ID → als MarktplatzSKU verwenden
  price?: number;          // Preis in CENT (÷ 100 = EUR)
  product?: {
    title?: string;
    eans?: string[];
  };
};

type KauflandAddress = {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  street?: string;
  house_number?: string;
  additional_field?: string;
  postcode?: string;
  city?: string;
  country?: string;
  phone?: string;
};

type KauflandOrderDetail = {
  id_order: string;
  ts_created_iso?: string;
  buyer?: {
    id_buyer?: number;
    email?: string;
  };
  shipping_address?: KauflandAddress;
  billing_address?: KauflandAddress;
  order_units?: KauflandOrderUnit[];
};

// fromIso: ISO-Timestamp ab dem importiert wird, z.B. "2026-07-16T00:00:00Z"
// storefront: "de", "at", "fr" — überschreibt KAUFLAND_STOREFRONT env var
// API liefert Bestellungen absteigend (neueste zuerst) → frühzeitiger Abbruch möglich
export async function fetchKauflandOrders(fromIso?: string, storefront?: string): Promise<NormalizedOrder[]> {
  const sf = storefront ?? process.env.KAUFLAND_STOREFRONT ?? "de";
  const orders: NormalizedOrder[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${BASE}/orders?storefront=${sf}&status=need_to_be_sent&limit=${limit}&offset=${offset}`;
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

      // Detail-Endpoint: liefert Adressen + order_units eingebettet (kein separater Units-Call nötig)
      const detailUrl = `${BASE}/orders/${o.id_order}`;
      const detailRes = await fetch(detailUrl, { headers: signedHeaders("GET", detailUrl, "") });
      if (!detailRes.ok) continue;

      const detailData = await detailRes.json() as { data?: KauflandOrderDetail };
      const d = detailData.data;
      if (!d) continue;

      const sa = d.shipping_address ?? {};
      const ba = d.billing_address;

      // Kaufland liefert first_name/last_name (mit Unterstrich), buyer hat KEINEN Namen
      const firstName = sa.first_name ?? ba?.first_name ?? "";
      const lastName = sa.last_name ?? ba?.last_name ?? "";
      const customerName = [firstName, lastName].filter(Boolean).join(" ") || "Unbekannt";

      const units = d.order_units ?? [];

      orders.push({
        externalId: String(o.id_order),
        orderNumber: String(o.id_order),
        marketplace: "KAUFLAND",
        orderDate: new Date(o.ts_created_iso ?? d.ts_created_iso ?? new Date().toISOString()),
        customerName,
        street: [sa.street, sa.house_number].filter(Boolean).join(" "),
        zip: sa.postcode ?? "",
        city: sa.city ?? "",
        country: sa.country ?? "DE",
        billingName: ba
          ? [ba.first_name, ba.last_name].filter(Boolean).join(" ") || undefined
          : undefined,
        billingStreet: ba
          ? [ba.street, ba.house_number].filter(Boolean).join(" ") || undefined
          : undefined,
        billingZip: ba?.postcode,
        billingCity: ba?.city,
        billingCountry: ba?.country,
        phoneNumber: sa.phone || ba?.phone || undefined,
        items: units.map((u) => ({
          // id_offer = Kaufland-Angebots-ID (beste verfügbare Seller-SKU)
          marketplaceSku: u.id_offer ?? "UNKNOWN",
          positionItemId: String(u.id_order_unit),
          title: u.product?.title ?? u.id_offer ?? "Artikel",
          quantity: 1,
          // Preis kommt in Cent → in EUR umrechnen
          price: u.price != null ? u.price / 100 : 0,
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
  // Kaufland erwartet Großbuchstaben: "DHL", "GLS" etc.
  const carrierCode = params.carrier === "DHL" ? "DHL" : "GLS";

  for (const unitId of params.orderUnitIds) {
    const url = `${BASE}/order-units/${unitId}/send`;
    const bodyObj = { tracking_numbers: params.trackingNumber, carrier_code: carrierCode };
    const bodyStr = JSON.stringify(bodyObj);

    const res = await fetch(url, {
      method: "PATCH",
      headers: signedHeaders("PATCH", url, bodyStr),
      body: bodyStr,
    });

    if (!res.ok) {
      const text = await res.text();
      // "already_marked_as_sent" ist kein Fehler — Unit wurde bereits gemeldet
      if (text.includes("already_marked_as_sent")) continue;
      throw new Error(`Kaufland Versandmeldung Fehler ${res.status} (unit ${unitId}): ${text}`);
    }
  }
}

export async function uploadKauflandInvoice(
  idOrder: string,
  pdfBytes: Uint8Array,
  filename: string,
): Promise<void> {
  const url = `${BASE}/order-invoices/${idOrder}`;
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
