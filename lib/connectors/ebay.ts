import type { NormalizedOrder } from "./otto";

const EBAY_API = "https://api.ebay.com";

const clean = (v: string | undefined) => (v ?? "").replace(/^﻿/, "").trim();

async function getAccessToken(): Promise<string> {
  const clientId = clean(process.env.EBAY_CLIENT_ID);
  const clientSecret = clean(process.env.EBAY_CLIENT_SECRET);
  const refreshToken = clean(process.env.EBAY_REFRESH_TOKEN);

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("EBAY_CLIENT_ID, EBAY_CLIENT_SECRET oder EBAY_REFRESH_TOKEN fehlt");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${EBAY_API}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay Token-Fehler ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("eBay: Kein access_token erhalten");
  return data.access_token;
}

type EbayAddress = {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  countryCode?: string;
};

type EbayShipTo = {
  fullName?: string;
  contactAddress?: EbayAddress;
  primaryPhone?: { phoneNumber?: string };
};

type EbayLineItem = {
  lineItemId: string;
  title?: string;
  quantity?: number;
  sku?: string;
  lineItemCost?: { value?: string };
};

type EbayOrder = {
  orderId: string;
  legacyOrderId?: string;
  creationDate: string;
  orderFulfillmentStatus?: string;
  fulfillmentStartInstructions?: { shippingStep?: { shipTo?: EbayShipTo } }[];
  lineItems?: EbayLineItem[];
};

export async function fetchEbayOrders(): Promise<NormalizedOrder[]> {
  const token = await getAccessToken();
  const orders: NormalizedOrder[] = [];
  let offset = 0;
  const limit = 50;

  for (;;) {
    const url = new URL(`${EBAY_API}/sell/fulfillment/v1/order`);
    url.searchParams.set("filter", "orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS}");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_DE",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`eBay Orders-Fehler ${res.status}: ${text}`);
    }

    const data = (await res.json()) as { orders?: EbayOrder[]; total?: number };
    const page = data.orders ?? [];
    if (page.length === 0) break;

    for (const o of page) {
      const shipTo = o.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo;
      const addr = shipTo?.contactAddress;

      orders.push({
        externalId: o.orderId,
        orderNumber: o.legacyOrderId ?? o.orderId,
        marketplace: "EBAY",
        orderDate: new Date(o.creationDate),
        customerName: shipTo?.fullName ?? "Unbekannt",
        street: [addr?.addressLine1, addr?.addressLine2].filter(Boolean).join(" "),
        zip: addr?.postalCode ?? "",
        city: addr?.city ?? "",
        country: addr?.countryCode ?? "DE",
        phoneNumber: shipTo?.primaryPhone?.phoneNumber || undefined,
        items: (o.lineItems ?? []).map((li) => ({
          marketplaceSku: li.sku || li.lineItemId,
          positionItemId: li.lineItemId,
          title: li.title ?? "Artikel",
          quantity: li.quantity ?? 1,
          price: parseFloat(li.lineItemCost?.value ?? "0"),
        })),
      });
    }

    if (page.length < limit) break;
    offset += limit;
  }

  return orders;
}

const EBAY_CARRIER_MAP: Record<string, string> = {
  DHL: "DHL",
  GEL: "GEL_EXPRESS",
};

export async function sendEbayShipment(params: {
  orderId: string;
  trackingNumber: string;
  carrier: "DHL" | "GEL";
  lineItems: { lineItemId: string; quantity: number }[];
}): Promise<void> {
  const token = await getAccessToken();

  const url = `${EBAY_API}/sell/fulfillment/v1/order/${encodeURIComponent(params.orderId)}/shipping_fulfillment`;

  const body = {
    lineItems: params.lineItems,
    shippedDate: new Date().toISOString(),
    shippingCarrierCode: EBAY_CARRIER_MAP[params.carrier] ?? "OTHER",
    trackingNumber: params.trackingNumber,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_DE",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay Versandmeldung ${res.status}: ${text}`);
  }
}
