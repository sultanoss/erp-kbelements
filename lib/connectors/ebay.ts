import type { NormalizedOrder } from "./otto";

const EBAY_API = "https://api.ebay.com";

const clean = (v: string | undefined) => (v ?? "").replace(/^﻿/, "").trim();

interface EbayCreds {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

async function getAccessToken(creds: EbayCreds): Promise<string> {
  if (!creds.clientId || !creds.clientSecret || !creds.refreshToken) {
    throw new Error("eBay-Credentials unvollständig");
  }

  const credentials = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");

  const res = await fetch(`${EBAY_API}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refreshToken,
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

function mainCreds(): EbayCreds {
  return {
    clientId: clean(process.env.EBAY_CLIENT_ID),
    clientSecret: clean(process.env.EBAY_CLIENT_SECRET),
    refreshToken: clean(process.env.EBAY_REFRESH_TOKEN),
  };
}

function outletCreds(): EbayCreds {
  return {
    clientId: clean(process.env.EBAY_CLIENT_ID),
    clientSecret: clean(process.env.EBAY_CLIENT_SECRET),
    refreshToken: clean(process.env.EBAY_OUTLET_REFRESH_TOKEN),
  };
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

async function fetchOrdersWithCreds(creds: EbayCreds, marketplace: string): Promise<NormalizedOrder[]> {
  const token = await getAccessToken(creds);
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
        marketplace,
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

export async function fetchEbayOrders(): Promise<NormalizedOrder[]> {
  return fetchOrdersWithCreds(mainCreds(), "EBAY");
}

export async function fetchEbayOutletOrders(): Promise<NormalizedOrder[]> {
  return fetchOrdersWithCreds(outletCreds(), "EBAY_OUTLET");
}

const EBAY_CARRIER_MAP: Record<string, string> = {
  DHL: "DHL",
  GEL: "GEL_EXPRESS",
};

export type SendEbayShipmentParams = {
  orderId: string;
  trackingNumber: string;
  carrier: "DHL" | "GEL";
  lineItems: { lineItemId: string; quantity: number }[];
};

async function sendShipmentWithCreds(params: SendEbayShipmentParams, creds: EbayCreds): Promise<void> {
  const token = await getAccessToken(creds);

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

export async function sendEbayShipment(params: SendEbayShipmentParams): Promise<void> {
  return sendShipmentWithCreds(params, mainCreds());
}

export async function sendEbayOutletShipment(params: SendEbayShipmentParams): Promise<void> {
  return sendShipmentWithCreds(params, outletCreds());
}

async function getInventoryAccessToken(creds: EbayCreds): Promise<string> {
  if (!creds.clientId || !creds.clientSecret || !creds.refreshToken) {
    throw new Error("eBay-Credentials unvollständig");
  }
  const credentials = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
  const res = await fetch(`${EBAY_API}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refreshToken,
      scope: "https://api.ebay.com/oauth/api_scope/sell.inventory",
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay Inventory Token-Fehler ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("eBay: Kein Inventory access_token — bitte eBay neu verbinden");
  return data.access_token;
}

export type EbayInventorySku = { marketplaceSku: string; title: string | null };

export async function fetchEbayInventorySkus(account: "main" | "outlet" = "main"): Promise<EbayInventorySku[]> {
  const creds = account === "main" ? mainCreds() : outletCreds();
  const token = await getInventoryAccessToken(creds);
  const skus: EbayInventorySku[] = [];
  let offset = 0;
  const limit = 25;

  for (;;) {
    const url = new URL(`${EBAY_API}/sell/inventory/v1/inventory_item`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });

    if (!res.ok) break;

    type InvResp = { inventoryItems?: Array<{ sku: string; product?: { title?: string } }>; total?: number };
    const data = (await res.json()) as InvResp;
    const items = data.inventoryItems ?? [];
    if (items.length === 0) break;

    for (const item of items) {
      skus.push({ marketplaceSku: item.sku, title: item.product?.title ?? null });
    }

    if (items.length < limit) break;
    offset += limit;
  }

  return skus;
}

export type StockPushResult = { marketplaceSku: string; ok: boolean; error?: string };

export async function pushEbayStock(
  items: Array<{ marketplaceSku: string; quantity: number }>,
  account: "main" | "outlet" = "main"
): Promise<StockPushResult[]> {
  const creds = account === "main" ? mainCreds() : outletCreds();
  const token = await getInventoryAccessToken(creds);
  const results: StockPushResult[] = [];

  // eBay allows max 25 per request
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    const res = await fetch(`${EBAY_API}/sell/inventory/v1/bulk_update_price_quantity`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_DE",
      },
      body: JSON.stringify({
        requests: chunk.map((item) => ({
          sku: item.marketplaceSku,
          shipToLocationAvailability: { quantity: item.quantity },
        })),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      for (const item of chunk) {
        results.push({ marketplaceSku: item.marketplaceSku, ok: false, error: `HTTP ${res.status}: ${text.slice(0, 100)}` });
      }
      continue;
    }

    type BulkResp = { responses?: Array<{ sku: string; statusCode: number; errors?: Array<{ message: string }> }> };
    const data = (await res.json()) as BulkResp;
    for (const r of data.responses ?? []) {
      results.push({
        marketplaceSku: r.sku,
        ok: r.statusCode === 200,
        error: r.errors?.[0]?.message,
      });
    }
  }

  return results;
}
