import type { NormalizedOrder } from "./otto";

const BASE = "https://mediamarktsaturn.mirakl.net/api";

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
  customer?: { firstname?: string; lastname?: string };
  shipping_address?: MiraklAddress;
  billing_address?: MiraklAddress;
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

      const sa = o.shipping_address ?? {};
      const ba = o.billing_address;

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
        country: sa.country_iso_code ?? "DE",
        billingName: ba
          ? [ba.firstname, ba.lastname].filter(Boolean).join(" ") || undefined
          : undefined,
        billingStreet: ba
          ? [ba.street_1, ba.street_2].filter(Boolean).join(" ") || undefined
          : undefined,
        billingZip: ba?.zip_code,
        billingCity: ba?.city,
        billingCountry: ba?.country_iso_code,
        phoneNumber: sa.phone || ba?.phone || undefined,
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
}): Promise<void> {
  const url = `${BASE}/orders/${params.orderId}/ship`;
  const body = JSON.stringify({
    carrier_name: params.carrier === "DHL" ? "DHL" : "GEL Express",
    tracking_number: params.trackingNumber,
    carrier_url: "",
  });

  const res = await fetch(url, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MediaMarkt Versandmeldung Fehler ${res.status}: ${text}`);
  }
}

export async function uploadMediaMarktInvoice(
  orderId: string,
  pdfBytes: Uint8Array,
  filename: string,
): Promise<void> {
  const url = `${BASE}/orders/${orderId}/invoice`;

  const formData = new FormData();
  formData.append("file", new Blob([pdfBytes], { type: "application/pdf" }), filename);

  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MediaMarkt Rechnungsupload Fehler ${res.status}: ${text}`);
  }
}
