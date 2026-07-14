const OTTO_TOKEN_URL = "https://api.otto.market/v1/token";
const OTTO_ORDERS_URL = "https://api.otto.market/v4/orders";

export interface NormalizedOrder {
  externalId: string;
  marketplace: string;
  orderDate: Date;
  customerName: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  items: {
    marketplaceSku: string;
    title: string;
    quantity: number;
    price: number;
  }[];
}

// In-memory token cache (valid for 1 hour per serverless instance)
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  const clientId = process.env.OTTO_CLIENT_ID;
  const clientSecret = process.env.OTTO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("OTTO_CLIENT_ID oder OTTO_CLIENT_SECRET fehlt");

  const res = await fetch(OTTO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Otto Token-Fehler ${res.status}: ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

export async function fetchNewOrders(): Promise<NormalizedOrder[]> {
  const token = await getToken();

  const url = new URL(OTTO_ORDERS_URL);
  url.searchParams.set("fulfillmentStatus", "ANNOUNCED");
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
      orderDate: string;
      deliveryAddress: {
        firstName: string;
        lastName: string;
        street: string;
        houseNumber?: string;
        zipCode: string;
        city: string;
        countryCode?: string;
      };
      positionItems: {
        sku: string;
        title?: string;
        productTitle?: string;
        quantity: number;
        salePrice?: { amount: number };
        itemValueGrossPrice?: { amount: number };
      }[];
    }[];
  };

  const resources = data.resources ?? [];

  return resources.map((o) => ({
    externalId: o.salesOrderId,
    marketplace: "OTTO",
    orderDate: new Date(o.orderDate),
    customerName: `${o.deliveryAddress.firstName} ${o.deliveryAddress.lastName}`.trim(),
    street: `${o.deliveryAddress.street}${o.deliveryAddress.houseNumber ? " " + o.deliveryAddress.houseNumber : ""}`,
    zip: o.deliveryAddress.zipCode,
    city: o.deliveryAddress.city,
    country: o.deliveryAddress.countryCode ?? "DE",
    items: o.positionItems.map((p) => ({
      marketplaceSku: p.sku,
      title: p.title ?? p.productTitle ?? p.sku,
      quantity: p.quantity,
      price: p.salePrice?.amount ?? p.itemValueGrossPrice?.amount ?? 0,
    })),
  }));
}
