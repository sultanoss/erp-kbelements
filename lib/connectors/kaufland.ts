import { createHmac } from "crypto";
import type { NormalizedOrder } from "./otto";

const BASE = "https://sellerapi.kaufland.com/v2";

function signedHeaders(method: string, fullUrl: string, bodyStr: string): Record<string, string> {
  const clientKey = process.env.KAUFLAND_CLIENT_KEY ?? "";
  const secretKey = process.env.KAUFLAND_SECRET_KEY ?? "";
  if (!clientKey || !secretKey) throw new Error("KAUFLAND_CLIENT_KEY oder KAUFLAND_SECRET_KEY fehlt");

  const timestamp = Math.floor(Date.now() / 1000);
  const msg = [method.toUpperCase(), fullUrl, bodyStr, String(timestamp)].join("\n");
  const sig = createHmac("sha256", secretKey).update(msg).digest("base64");

  return {
    "Shop-Client-Key": clientKey,
    "Shop-Timestamp": String(timestamp),
    "Shop-Signature": sig,
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "kbelements-erp/1.0",
  };
}

export async function fetchKauflandOrders(): Promise<NormalizedOrder[]> {
  const storefront = process.env.KAUFLAND_STOREFRONT ?? "de";
  const url = `${BASE}/orders?storefront=${storefront}&status=need_to_be_sent&limit=100`;

  const res = await fetch(url, { headers: signedHeaders("GET", url, "") });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kaufland Orders-Fehler ${res.status}: ${text}`);
  }

  const data = await res.json() as {
    data?: Array<{
      id_order: string;
      id_purchase?: string | number;
      ts_created: string;
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
    }>;
  };

  const orders: NormalizedOrder[] = [];

  for (const o of data.data ?? []) {
    const unitsUrl = `${BASE}/order-units?storefront=${storefront}&id_order=${o.id_order}&limit=100`;
    const unitsRes = await fetch(unitsUrl, { headers: signedHeaders("GET", unitsUrl, "") });
    if (!unitsRes.ok) continue;

    const unitsData = await unitsRes.json() as {
      data?: Array<{
        id_order_unit: string | number;
        id_product_variant?: string | number;
        ean?: string;
        title?: string;
        unit_price?: number;
      }>;
    };

    const sa = o.shipping_address ?? {};
    const ba = o.billing_address;

    const customerName = [
      sa.firstname ?? o.buyer?.firstname,
      sa.lastname ?? o.buyer?.lastname,
    ].filter(Boolean).join(" ") || "Unbekannt";

    orders.push({
      externalId: String(o.id_order),
      orderNumber: o.id_purchase != null ? String(o.id_purchase) : undefined,
      marketplace: "KAUFLAND",
      orderDate: new Date(o.ts_created),
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
      phoneNumber: o.buyer?.phone,
      items: (unitsData.data ?? []).map((u) => ({
        marketplaceSku: String(u.id_product_variant ?? u.ean ?? "UNKNOWN"),
        positionItemId: String(u.id_order_unit),
        title: u.title ?? String(u.id_product_variant ?? "Artikel"),
        quantity: 1,
        price: u.unit_price ?? 0,
      })),
    });
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
