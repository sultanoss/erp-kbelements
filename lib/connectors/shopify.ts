import type { NormalizedOrder } from "./otto";

const clean = (v: string | undefined) => (v ?? "").replace(/^﻿/, "").trim();

const BASE_URL = `https://${clean(process.env.SHOPIFY_STORE)}/admin/api/2024-10/graphql.json`;

async function shopifyGql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": clean(process.env.SHOPIFY_ACCESS_TOKEN),
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify GQL ${res.status}: ${await res.text()}`);
  const json = await res.json() as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`Shopify GQL: ${json.errors.map((e) => e.message).join(", ")}`);
  return json.data as T;
}

async function shopifyInventoryGql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": clean(process.env.SHOPIFY_INVENTORY_TOKEN),
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify GQL ${res.status}: ${await res.text()}`);
  const json = await res.json() as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`Shopify GQL: ${json.errors.map((e) => e.message).join(", ")}`);
  return json.data as T;
}

const ORDERS_QUERY = `
  query FetchOrders($cursor: String) {
    orders(first: 50, query: "fulfillment_status:unfulfilled financial_status:paid", after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          name
          createdAt
          shippingAddress {
            firstName lastName address1 address2 zip city countryCodeV2 phone
          }
          lineItems(first: 50) {
            edges {
              node {
                id
                title
                quantity
                sku
                originalUnitPriceSet { shopMoney { amount } }
              }
            }
          }
        }
      }
    }
  }
`;

export async function fetchShopifyOrders(): Promise<NormalizedOrder[]> {
  const orders: NormalizedOrder[] = [];
  let cursor: string | null = null;

  type OrdersResponse = {
    orders: {
      pageInfo: { hasNextPage: boolean; endCursor: string };
      edges: {
        node: {
          id: string;
          name: string;
          createdAt: string;
          shippingAddress: {
            firstName: string; lastName: string; address1: string; address2?: string;
            zip: string; city: string; countryCodeV2: string; phone?: string;
          } | null;
          lineItems: {
            edges: {
              node: {
                id: string; title: string; quantity: number;
                sku: string | null;
                originalUnitPriceSet: { shopMoney: { amount: string } };
              };
            }[];
          };
        };
      }[];
    };
  };

  for (;;) {
    const data: OrdersResponse = await shopifyGql<OrdersResponse>(ORDERS_QUERY, cursor ? { cursor } : {});

    for (const { node } of data.orders.edges) {
      const addr = node.shippingAddress;
      orders.push({
        externalId: node.id,
        orderNumber: node.name,
        marketplace: "SHOPIFY",
        orderDate: new Date(node.createdAt),
        customerName: addr ? `${addr.firstName} ${addr.lastName}`.trim() : "Unbekannt",
        street: addr ? [addr.address1, addr.address2].filter(Boolean).join(" ") : "",
        zip: addr?.zip ?? "",
        city: addr?.city ?? "",
        country: addr?.countryCodeV2 ?? "",
        phoneNumber: addr?.phone || undefined,
        items: node.lineItems.edges.map(({ node: li }: { node: { id: string; title: string; quantity: number; sku: string | null; originalUnitPriceSet: { shopMoney: { amount: string } } } }) => ({
          marketplaceSku: li.sku || "UNKNOWN",
          positionItemId: li.id,
          title: li.title,
          quantity: li.quantity,
          price: parseFloat(li.originalUnitPriceSet.shopMoney.amount),
        })),
      });
    }

    if (!data.orders.pageInfo.hasNextPage) break;
    cursor = data.orders.pageInfo.endCursor;
  }

  return orders;
}

const FULFILLMENT_ORDERS_QUERY = `
  query GetFulfillmentOrders($orderId: ID!) {
    order(id: $orderId) {
      fulfillmentOrders(first: 5) {
        edges {
          node {
            id
            status
            lineItems(first: 50) {
              edges {
                node { id remainingQuantity }
              }
            }
          }
        }
      }
    }
  }
`;

const FULFILLMENT_CREATE_MUTATION = `
  mutation FulfillmentCreate($fulfillment: FulfillmentV2Input!) {
    fulfillmentCreateV2(fulfillment: $fulfillment) {
      fulfillment { id status }
      userErrors { field message }
    }
  }
`;

const TRACKING_URL_MAP: Record<string, string> = {
  GEL: "https://www.gel-express.de/de/sendungsverfolgung/",
};

// Shopify erkennt Sendungsnummern automatisch → explizit company setzen um Auto-Detect zu verhindern
const CARRIER_COMPANY_MAP: Record<string, string> = {
  DHL: "DHL",
  GEL: "Other",
};

export async function sendShopifyFulfillment(params: {
  orderId: string;
  trackingNumber: string;
  carrier: "DHL" | "GEL";
}): Promise<void> {
  const foData = await shopifyGql<{
    order: {
      fulfillmentOrders: {
        edges: {
          node: {
            id: string;
            status: string;
            lineItems: { edges: { node: { id: string; remainingQuantity: number } }[] };
          };
        }[];
      };
    } | null;
  }>(FULFILLMENT_ORDERS_QUERY, { orderId: params.orderId });

  if (!foData.order) throw new Error("Shopify: Bestellung nicht gefunden");

  const openFOs = foData.order.fulfillmentOrders.edges
    .map((e) => e.node)
    .filter((fo) => fo.status === "OPEN");

  if (openFOs.length === 0) return; // Already fulfilled

  const lineItemsByFulfillmentOrder = openFOs
    .map((fo) => ({
      fulfillmentOrderId: fo.id,
      fulfillmentOrderLineItems: fo.lineItems.edges
        .filter((e) => e.node.remainingQuantity > 0)
        .map((e) => ({ id: e.node.id, quantity: e.node.remainingQuantity })),
    }))
    .filter((fo) => fo.fulfillmentOrderLineItems.length > 0);

  if (lineItemsByFulfillmentOrder.length === 0) return;

  const result = await shopifyGql<{
    fulfillmentCreateV2: {
      fulfillment: { id: string; status: string } | null;
      userErrors: { field: string; message: string }[];
    };
  }>(FULFILLMENT_CREATE_MUTATION, {
    fulfillment: {
      notifyCustomer: true,
      trackingInfo: {
        company: CARRIER_COMPANY_MAP[params.carrier] ?? "Other",
        number: params.trackingNumber,
        ...(TRACKING_URL_MAP[params.carrier] ? { url: TRACKING_URL_MAP[params.carrier] } : {}),
      },
      lineItemsByFulfillmentOrder,
    },
  });

  const errors = result.fulfillmentCreateV2.userErrors;
  if (errors.length > 0) {
    throw new Error(`Shopify Fulfillment: ${errors.map((e) => e.message).join(", ")}`);
  }
}

export type ShopifyInventorySku = { marketplaceSku: string; title: string | null };
export type ShopifyStockPushResult = { marketplaceSku: string; ok: boolean; error?: string };

// Nur sku + displayName — braucht nur read_products, kein read_inventory
const VARIANTS_DISPLAY_QUERY = `
  query getVariantsDisplay($cursor: String) {
    productVariants(first: 250, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          sku
          displayName
        }
      }
    }
  }
`;

// Mit inventoryItem — braucht read_inventory (nur für pushShopifyStock)
const VARIANTS_INVENTORY_QUERY = `
  query getVariantsInventory($cursor: String) {
    productVariants(first: 250, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          sku
          inventoryItem { id }
        }
      }
    }
  }
`;

type VariantsDisplayResponse = {
  productVariants: {
    pageInfo: { hasNextPage: boolean; endCursor: string };
    edges: { node: { sku: string | null; displayName: string } }[];
  };
};

type VariantsInventoryResponse = {
  productVariants: {
    pageInfo: { hasNextPage: boolean; endCursor: string };
    edges: { node: { sku: string | null; inventoryItem: { id: string } } }[];
  };
};

export async function fetchShopifySkus(): Promise<ShopifyInventorySku[]> {
  const skus: ShopifyInventorySku[] = [];
  let cursor: string | null = null;

  for (;;) {
    const data: VariantsDisplayResponse = await shopifyInventoryGql<VariantsDisplayResponse>(VARIANTS_DISPLAY_QUERY, cursor ? { cursor } : {});
    for (const { node } of data.productVariants.edges) {
      if (!node.sku) continue;
      skus.push({ marketplaceSku: node.sku, title: node.displayName });
    }
    if (!data.productVariants.pageInfo.hasNextPage) break;
    cursor = data.productVariants.pageInfo.endCursor;
  }

  return skus;
}

const SET_QUANTITIES_MUTATION = `
  mutation setQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      userErrors { field message }
    }
  }
`;

export async function pushShopifyStock(
  items: Array<{ marketplaceSku: string; quantity: number }>
): Promise<ShopifyStockPushResult[]> {
  // Schritt 1: Primären Lagerort laden
  const locData = await shopifyInventoryGql<{
    locations: { edges: { node: { id: string } }[] };
  }>(`{ locations(first: 1, includeLegacy: false, includeInactive: false) { edges { node { id } } } }`);

  const locationId = locData.locations.edges[0]?.node.id;
  if (!locationId) {
    return items.map((i) => ({ marketplaceSku: i.marketplaceSku, ok: false, error: "Kein Shopify-Lagerort gefunden" }));
  }

  // Schritt 2: SKU → inventoryItemId Mapping aufbauen
  const skuToItemId = new Map<string, string>();
  let cursor: string | null = null;
  for (;;) {
    const data: VariantsInventoryResponse = await shopifyInventoryGql<VariantsInventoryResponse>(VARIANTS_INVENTORY_QUERY, cursor ? { cursor } : {});
    for (const { node } of data.productVariants.edges) {
      if (node.sku) skuToItemId.set(node.sku, node.inventoryItem.id);
    }
    if (!data.productVariants.pageInfo.hasNextPage) break;
    cursor = data.productVariants.pageInfo.endCursor;
  }

  const results: ShopifyStockPushResult[] = [];
  const found = items.filter((i) => skuToItemId.has(i.marketplaceSku));
  const notFound = items.filter((i) => !skuToItemId.has(i.marketplaceSku));

  // Schritt 3: inventorySetQuantities in Batches à 100
  for (let i = 0; i < found.length; i += 100) {
    const chunk = found.slice(i, i + 100);
    const quantities = chunk.map((item) => ({
      inventoryItemId: skuToItemId.get(item.marketplaceSku)!,
      locationId,
      quantity: item.quantity,
    }));

    const res = await shopifyInventoryGql<{
      inventorySetQuantities: { userErrors: { field: string; message: string }[] };
    }>(SET_QUANTITIES_MUTATION, {
      input: {
        name: "available",
        reason: "correction",
        ignoreCompareQuantity: true,
        quantities,
      },
    });

    const userErrors = res.inventorySetQuantities.userErrors;
    if (userErrors.length > 0) {
      const msg = userErrors.map((e) => e.message).join(", ");
      for (const item of chunk) {
        results.push({ marketplaceSku: item.marketplaceSku, ok: false, error: msg });
      }
    } else {
      for (const item of chunk) {
        results.push({ marketplaceSku: item.marketplaceSku, ok: true });
      }
    }
  }

  for (const item of notFound) {
    results.push({ marketplaceSku: item.marketplaceSku, ok: false, error: "Nicht in Shopify gefunden" });
  }

  return results;
}
