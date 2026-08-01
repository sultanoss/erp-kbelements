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

export type EbayInventorySku = { marketplaceSku: string; title: string | null; itemId?: string };

// Fetch all active eBay listings via Trading API (supports traditional/Seller Hub listings)
export async function fetchEbayInventorySkus(account: "main" | "outlet" = "main"): Promise<EbayInventorySku[]> {
  const creds = account === "main" ? mainCreds() : outletCreds();
  // sell.fulfillment reicht für GetMyeBaySelling (Trading API)
  const token = await getAccessToken(creds);
  const skus: EbayInventorySku[] = [];
  let page = 1;

  for (;;) {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySelling xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials><eBayAuthToken>${token}</eBayAuthToken></RequesterCredentials>
  <ActiveList>
    <Include>true</Include>
    <IncludeNotes>false</IncludeNotes>
    <Pagination><EntriesPerPage>200</EntriesPerPage><PageNumber>${page}</PageNumber></Pagination>
  </ActiveList>
  <OutputSelector>ItemID</OutputSelector>
  <OutputSelector>SKU</OutputSelector>
  <OutputSelector>Title</OutputSelector>
  <OutputSelector>PaginationResult</OutputSelector>
</GetMyeBaySelling>`;

    const res = await fetch("https://api.ebay.com/ws/api.dll", {
      method: "POST",
      headers: {
        "X-EBAY-API-CALL-NAME": "GetMyeBaySelling",
        "X-EBAY-API-SITEID": "77",
        "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
        "X-EBAY-API-IAF-TOKEN": token,
        "Content-Type": "text/xml",
      },
      body: xml,
    });

    if (!res.ok) break;
    const text = await res.text();

    // Parse ItemID, SKU (custom label), Title from XML
    const itemMatches = text.matchAll(/<Item>([\s\S]*?)<\/Item>/g);
    let count = 0;
    for (const match of itemMatches) {
      const block = match[1];
      const itemId = block.match(/<ItemID>([^<]+)<\/ItemID>/)?.[1] ?? "";
      const sku = block.match(/<SKU>([^<]+)<\/SKU>/)?.[1] ?? "";
      const title = block.match(/<Title>([^<]+)<\/Title>/)?.[1] ?? null;
      // Listings ohne Custom Label: ItemID als Kennung verwenden
      const marketplaceSku = sku || itemId;
      if (marketplaceSku) skus.push({ marketplaceSku, title, itemId });
      count++;
    }

    // Check if more pages
    const totalPages = parseInt(text.match(/<TotalNumberOfPages>(\d+)<\/TotalNumberOfPages>/)?.[1] ?? "1");
    if (page >= totalPages || count === 0) break;
    page++;
  }

  return skus;
}

export type StockPushResult = { marketplaceSku: string; ok: boolean; error?: string };

export async function pushEbayStock(
  items: Array<{ marketplaceSku: string; quantity: number }>,
  account: "main" | "outlet" = "main"
): Promise<StockPushResult[]> {
  const creds = account === "main" ? mainCreds() : outletCreds();
  const token = await getAccessToken(creds);
  const results: StockPushResult[] = [];

  // Fetch all active listings to get ItemID per custom label (SKU)
  const listings = await fetchEbayInventorySkus(account);
  const skuToItemId = new Map(listings.map((l) => [l.marketplaceSku, l.itemId]));

  // Trading API ReviseInventoryStatus — max 4 items per call
  for (let i = 0; i < items.length; i += 4) {
    const chunk = items.slice(i, i + 4);
    const inventoryNodes = chunk
      .map((item) => {
        const itemId = skuToItemId.get(item.marketplaceSku);
        if (!itemId) return null;
        return `<InventoryStatus><ItemID>${itemId}</ItemID><Quantity>${item.quantity}</Quantity></InventoryStatus>`;
      })
      .filter(Boolean);

    // Items with no ItemID → not found
    for (const item of chunk) {
      if (!skuToItemId.get(item.marketplaceSku)) {
        results.push({ marketplaceSku: item.marketplaceSku, ok: false, error: "Kein eBay-Listing mit dieser SKU gefunden" });
      }
    }
    if (inventoryNodes.length === 0) continue;

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseInventoryStatusRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials><eBayAuthToken>${token}</eBayAuthToken></RequesterCredentials>
  ${inventoryNodes.join("\n  ")}
</ReviseInventoryStatusRequest>`;

    const res = await fetch("https://api.ebay.com/ws/api.dll", {
      method: "POST",
      headers: {
        "X-EBAY-API-CALL-NAME": "ReviseInventoryStatus",
        "X-EBAY-API-SITEID": "77",
        "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
        "X-EBAY-API-IAF-TOKEN": token,
        "Content-Type": "text/xml",
      },
      body: xml,
    });

    const text = await res.text();
    const ack = text.match(/<Ack>([^<]+)<\/Ack>/)?.[1];

    if (!res.ok || ack === "Failure") {
      const errMsg = text.match(/<LongMessage>([^<]+)<\/LongMessage>/)?.[1] ?? `HTTP ${res.status}`;
      // eBay reports "same quantity" as a Failure — treat as success (nothing to change)
      const isSameQty =
        errMsg.toLowerCase().includes("identisch") ||
        errMsg.toLowerCase().includes("same as") ||
        errMsg.toLowerCase().includes("not revised");
      for (const item of chunk) {
        if (skuToItemId.get(item.marketplaceSku)) {
          results.push(isSameQty ? { marketplaceSku: item.marketplaceSku, ok: true } : { marketplaceSku: item.marketplaceSku, ok: false, error: errMsg });
        }
      }
      continue;
    }

    for (const item of chunk) {
      if (skuToItemId.get(item.marketplaceSku)) {
        results.push({ marketplaceSku: item.marketplaceSku, ok: true });
      }
    }
  }

  return results;
}
