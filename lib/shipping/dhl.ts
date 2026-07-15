import type { ShipmentInput, ShipmentResult, ShippingProvider } from "./types";

const BASE_URLS = {
  sandbox: "https://api-sandbox.dhl.com/parcel/de/shipping/v2",
  production: "https://api-eu.dhl.com/parcel/de/shipping/v2",
};

function getBaseUrl(): string {
  const env = process.env.DHL_ENV ?? "sandbox";
  return BASE_URLS[env as keyof typeof BASE_URLS] ?? BASE_URLS.sandbox;
}

function getAuthHeader(): string {
  const user = process.env.DHL_USERNAME;
  const pass = process.env.DHL_PASSWORD;
  if (!user || !pass) throw new Error("DHL credentials not configured");
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

function getBillingNumber(): string {
  const bn = process.env.DHL_BILLING_NUMBER_SHIPPING;
  if (!bn) throw new Error("DHL_BILLING_NUMBER_SHIPPING not configured");
  return bn;
}

function splitStreetAndHouse(street: string): { street: string; house: string } {
  // "Musterstraße 12a" → street: "Musterstraße", house: "12a"
  const match = street.match(/^(.+?)\s+(\d+\S*)$/);
  if (match) return { street: match[1], house: match[2] };
  return { street, house: "" };
}

export class DHLShippingProvider implements ShippingProvider {
  async createShipment(input: ShipmentInput): Promise<ShipmentResult> {
    if (!input.weight || input.weight <= 0) {
      throw new Error("DHL: Gewicht (kg) ist erforderlich");
    }

    const shipperStreet = process.env.DHL_SHIPPER_STREET ?? "";
    const shipperHouse = process.env.DHL_SHIPPER_HOUSE ?? "";
    const { street: consigneeStreet, house: consigneeHouse } = splitStreetAndHouse(
      input.consignee.street
    );

    const body = {
      profile: "STANDARD_GRUPPENPROFIL",
      shipments: [
        {
          product: "V62WP",
          billingNumber: getBillingNumber(),
          refNo: input.orderId,
          shipper: {
            name1: process.env.DHL_SHIPPER_NAME ?? "KB Elements",
            addressStreet: shipperStreet,
            addressHouse: shipperHouse,
            postalCode: process.env.DHL_SHIPPER_ZIP ?? "",
            city: process.env.DHL_SHIPPER_CITY ?? "",
            country: "DEU",
          },
          consignee: {
            name1: input.consignee.name,
            addressStreet: consigneeStreet,
            addressHouse: consigneeHouse,
            postalCode: input.consignee.zip,
            city: input.consignee.city,
            country: input.consignee.country === "DE" ? "DEU" : input.consignee.country,
          },
          details: {
            weight: { uom: "kg", value: input.weight },
          },
        },
      ],
    };

    const res = await fetch(`${getBaseUrl()}/orders?validate=false&includeDocs=URL&printFormat=910-300-300`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await res.json() as {
      items?: Array<{
        shipmentNo?: string;
        label?: { url?: string };
        sstatus?: { title?: string; detail?: string };
      }>;
      title?: string;
      detail?: string;
    };

    if (!res.ok) {
      const detail = json.detail ?? json.title ?? `HTTP ${res.status}`;
      throw new Error(`DHL API Fehler: ${detail}`);
    }

    const item = json.items?.[0];
    if (!item?.shipmentNo) {
      throw new Error("DHL API: Keine Sendungsnummer in der Antwort");
    }

    return {
      trackingNumber: item.shipmentNo,
      labelUrl: item.label?.url,
      dhlShipmentId: item.shipmentNo,
      carrierResponse: json,
    };
  }
}
