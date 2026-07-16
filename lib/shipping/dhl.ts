import type { ShipmentInput, ShipmentItemInput, ShipmentResult, ShippingProvider } from "./types";

function buildRefNo(orderNumber: string | undefined, items: ShipmentItemInput[]): string {
  const skus = items.map(i => i.internalSku).join(",");
  const ref = [orderNumber, skus].filter(Boolean).join(" ");
  return ref.slice(0, 35);
}

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

function getBillingNumber(country: string): string {
  const isDomestic = country === "DE" || country === "DEU";
  const bn = isDomestic
    ? process.env.DHL_BILLING_NUMBER_SHIPPING
    : process.env.DHL_BILLING_NUMBER_INTERNATIONAL;
  if (!bn) throw new Error(isDomestic ? "DHL_BILLING_NUMBER_SHIPPING not configured" : "DHL_BILLING_NUMBER_INTERNATIONAL not configured");
  return bn;
}

function toIso3(c: string): string {
  const map: Record<string, string> = { DE: "DEU", AT: "AUT", FR: "FRA" };
  return map[c] ?? c;
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

    const consigneeCountryIso3 = toIso3(input.consignee.country);
    const isDomestic = consigneeCountryIso3 === "DEU";

    const body = {
      profile: "STANDARD_GRUPPENPROFIL",
      shipments: [
        {
          product: isDomestic ? "V01PAK" : "V53WPAK",
          billingNumber: getBillingNumber(input.consignee.country),
          refNo: buildRefNo(input.orderNumber, input.items),
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
            country: consigneeCountryIso3,
          },
          details: {
            weight: { uom: "kg", value: input.weight },
          },
          ...(isDomestic ? {
            services: {
              dhlRetoure: {
                billingNumber: process.env.DHL_BILLING_NUMBER_RETURN ?? "",
                refNo: buildRefNo(input.orderNumber, input.items),
                returnAddress: {
                  name1:         process.env.DHL_SHIPPER_NAME ?? "",
                  addressStreet: process.env.DHL_SHIPPER_STREET ?? "",
                  addressHouse:  process.env.DHL_SHIPPER_HOUSE ?? "",
                  postalCode:    process.env.DHL_SHIPPER_ZIP ?? "",
                  city:          process.env.DHL_SHIPPER_CITY ?? "",
                  country:       "DEU",
                },
              },
            },
          } : {}),
        },
      ],
    };

    const res = await fetch(`${getBaseUrl()}/orders?validate=false&includeDocs=URL&printFormat=910-300-300`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "dhl-api-key": process.env.DHL_API_KEY ?? "",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await res.json() as {
      items?: Array<{
        shipmentNo?: string;
        label?: { url?: string };
        returnShipmentNo?: string;
        returnLabel?: { url?: string };
        sstatus?: { title?: string; detail?: string };
      }>;
      title?: string;
      detail?: string;
    };

    if (!res.ok) {
      const detail = json.detail ?? json.title ?? JSON.stringify(json);
      throw new Error(`DHL API Fehler ${res.status}: ${detail}`);
    }

    const item = json.items?.[0];
    if (!item?.shipmentNo) {
      throw new Error("DHL API: Keine Sendungsnummer in der Antwort");
    }

    return {
      trackingNumber: item.shipmentNo,
      labelUrl: item.label?.url,
      returnTrackingNumber: item.returnShipmentNo,
      returnLabelUrl: item.returnLabel?.url,
      dhlShipmentId: item.shipmentNo,
      carrierResponse: json,
    };
  }
}
