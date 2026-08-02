const OTTO_TOKEN_URL = "https://api.otto.market/oauth2/token";
const OTTO_ORDERS_URL = "https://api.otto.market/v4/orders";
const OTTO_SHIPMENTS_URL = "https://api.otto.market/v1/shipments";
const OTTO_PRODUCTS_URL = "https://api.otto.market/v2/products";
const OTTO_AVAILABILITY_URL = "https://api.otto.market/v1/availability/quantities";

export interface NormalizedOrder {
  externalId: string;
  orderNumber?: string;
  marketplace: string;
  orderDate: Date;
  customerName: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  billingName?: string;
  billingStreet?: string;
  billingZip?: string;
  billingCity?: string;
  billingCountry?: string;
  phoneNumber?: string;
  items: {
    marketplaceSku: string;
    positionItemId?: string;
    title: string;
    quantity: number;
    price: number;
  }[];
}

const tokenCache: Record<string, { token: string; expiresAt: number }> = {};

async function getToken(scope: string = "orders"): Promise<string> {
  const cached = tokenCache[scope];
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;

  const clientId = process.env.OTTO_CLIENT_ID;
  const clientSecret = process.env.OTTO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("OTTO_CLIENT_ID oder OTTO_CLIENT_SECRET fehlt");

  const params: Record<string, string> = {
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  };
  if (scope) params.scope = scope;

  const res = await fetch(OTTO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Otto Token-Fehler ${res.status}: ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  tokenCache[scope] = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export async function fetchNewOrders(): Promise<NormalizedOrder[]> {
  const token = await getToken();

  const url = new URL(OTTO_ORDERS_URL);
  url.searchParams.set("fulfillmentStatus", "PROCESSABLE");
  url.searchParams.set("limit", "50");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Otto Orders-Fehler ${res.status}: ${text}`);
  }

  const data = await res.json() as {
    resources?: {
      salesOrderId: string;
      orderNumber?: string;
      orderDate: string;
      deliveryAddress: {
        firstName: string;
        lastName: string;
        street: string;
        houseNumber?: string;
        zipCode: string;
        city: string;
        countryCode?: string;
        phoneNumber?: string;
      };
      invoiceAddress?: {
        firstName: string;
        lastName: string;
        street: string;
        houseNumber?: string;
        zipCode: string;
        city: string;
        countryCode?: string;
      };
      positionItems: {
        positionItemId: string;
        itemValueGrossPrice?: { amount: number };
        salePrice?: { amount: number };
        product?: {
          sku: string;
          productTitle?: string;
          articleNumber?: string;
        };
      }[];
    }[];
  };

  const resources = data.resources ?? [];

  return resources.map((o) => {
    // Each positionItem = 1 unit — group by SKU and sum quantities
    const itemMap = new Map<string, {
      title: string; quantity: number; price: number; positionItemId: string;
    }>();
    for (const p of o.positionItems) {
      const sku = p.product?.sku ?? p.product?.articleNumber ?? "UNKNOWN";
      const title = p.product?.productTitle ?? sku;
      const price = p.itemValueGrossPrice?.amount ?? p.salePrice?.amount ?? 0;
      const existing = itemMap.get(sku);
      if (existing) {
        existing.quantity += 1;
      } else {
        itemMap.set(sku, { title, quantity: 1, price, positionItemId: p.positionItemId });
      }
    }

    return {
      externalId: o.salesOrderId,
      orderNumber: o.orderNumber,
      marketplace: "OTTO",
      orderDate: new Date(o.orderDate),
      customerName: `${o.deliveryAddress.firstName} ${o.deliveryAddress.lastName}`.trim(),
      street: `${o.deliveryAddress.street}${o.deliveryAddress.houseNumber ? " " + o.deliveryAddress.houseNumber : ""}`,
      zip: o.deliveryAddress.zipCode,
      city: o.deliveryAddress.city,
      country: o.deliveryAddress.countryCode ?? "DE",
      billingName: o.invoiceAddress
        ? `${o.invoiceAddress.firstName} ${o.invoiceAddress.lastName}`.trim()
        : undefined,
      billingStreet: o.invoiceAddress
        ? `${o.invoiceAddress.street}${o.invoiceAddress.houseNumber ? " " + o.invoiceAddress.houseNumber : ""}`
        : undefined,
      billingZip:     o.invoiceAddress?.zipCode,
      billingCity:    o.invoiceAddress?.city,
      billingCountry: o.invoiceAddress?.countryCode,
      phoneNumber:    o.deliveryAddress.phoneNumber,
      items: Array.from(itemMap.entries()).map(([sku, item]) => ({
        marketplaceSku: sku,
        positionItemId: item.positionItemId,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
      })),
    };
  });
}

export async function sendOttoShipmentNotification(params: {
  salesOrderId: string;
  carrier: "DHL" | "GEL";
  trackingNumber: string;
  returnTrackingNumber?: string;
  positionItemIds: string[];
  shipDate: string; // YYYY-MM-DD
}): Promise<void> {
  const token = await getToken("shipments");
  const ottoCarrier = params.carrier === "DHL" ? "DHL" : "GEL";

  const body = {
    trackingKey: {
      carrier: ottoCarrier,
      trackingNumber: params.trackingNumber,
    },
    shipDate: new Date().toISOString(),
    shipFromAddress: {
      city:        process.env.DHL_SHIPPER_CITY ?? "",
      countryCode: "DEU",
      zipCode:     process.env.DHL_SHIPPER_ZIP  ?? "",
    },
    positionItems: params.positionItemIds.map((positionItemId) => ({
      positionItemId,
      salesOrderId: params.salesOrderId,
      ...(params.returnTrackingNumber ? {
        returnTrackingKey: {
          carrier:        ottoCarrier,
          trackingNumber: params.returnTrackingNumber,
        },
      } : {}),
    })),
  };

  const res = await fetch(OTTO_SHIPMENTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Otto Versandmeldung Fehler ${res.status}: ${text}`);
  }
}

export type OttoInventorySku = { marketplaceSku: string; title: string | null };

export async function fetchOttoSkus(): Promise<OttoInventorySku[]> {
  const token = await getToken("");
  const skus: OttoInventorySku[] = [];
  let nextLink: string | null = `${OTTO_PRODUCTS_URL}?productLifeCycle=ACTIVE&limit=100`;

  while (nextLink) {
    const res = await fetch(nextLink, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    type OttoVariant = { sku?: string; productTitle?: string; productDescription?: { productTitle?: string } };
    const data = await res.json() as {
      resources?: Array<OttoVariant & { variants?: OttoVariant[]; productVariants?: OttoVariant[] }>;
      links?: Array<{ rel: string; href: string }>;
    };
    if (skus.length === 0 && data.resources?.[0]) {
      console.log("[Otto] Erstes Produkt Struktur:", JSON.stringify(Object.keys(data.resources[0])));
      console.log("[Otto] Erstes Produkt:", JSON.stringify(data.resources[0]).slice(0, 500));
    }
    for (const p of data.resources ?? []) {
      const sku = p.sku;
      const title = p.productTitle ?? p.productDescription?.productTitle ?? null;
      if (sku) skus.push({ marketplaceSku: sku, title });
      for (const v of p.variants ?? p.productVariants ?? []) {
        const vSku = v.sku;
        const vTitle = v.productTitle ?? v.productDescription?.productTitle ?? title;
        if (vSku && vSku !== sku) skus.push({ marketplaceSku: vSku, title: vTitle });
      }
    }
    const next = data.links?.find((l) => l.rel === "next");
    nextLink = next ? next.href : null;
  }

  return skus;
}

export type OttoStockPushResult = { marketplaceSku: string; ok: boolean; error?: string };

export async function pushOttoStock(
  items: Array<{ marketplaceSku: string; quantity: number }>
): Promise<OttoStockPushResult[]> {
  const token = await getToken("availability");
  const results: OttoStockPushResult[] = [];

  // POST /v1/availability/quantities — max 200 SKUs pro Request
  for (let i = 0; i < items.length; i += 200) {
    const chunk = items.slice(i, i + 200);
    const body = chunk.map((item) => ({ sku: item.marketplaceSku, quantity: item.quantity }));

    const res = await fetch(OTTO_AVAILABILITY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      for (const item of chunk) {
        results.push({ marketplaceSku: item.marketplaceSku, ok: false, error: `${res.status}: ${text.slice(0, 120)}` });
      }
    } else {
      for (const item of chunk) {
        results.push({ marketplaceSku: item.marketplaceSku, ok: true });
      }
    }
  }

  return results;
}
