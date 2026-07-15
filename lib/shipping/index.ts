import type { Carrier, ShippingProvider } from "./types";
import { DHLShippingProvider } from "./dhl";
import { GELShippingProvider } from "./gel";

export function getShippingProvider(carrier: Carrier): ShippingProvider {
  switch (carrier) {
    case "DHL": return new DHLShippingProvider();
    case "GEL": return new GELShippingProvider();
    default:    throw new Error(`Unbekannter Versandanbieter: ${carrier}`);
  }
}

export type { Carrier, ShipmentInput, ShipmentResult, ShippingProvider } from "./types";
