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
        ...(params.carrier === "DHL" ? { company: "DHL" } : {}),
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
