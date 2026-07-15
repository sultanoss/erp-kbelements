import type { ShipmentInput, ShipmentResult, ShippingProvider } from "./types";

export class GELShippingProvider implements ShippingProvider {
  async createShipment(input: ShipmentInput): Promise<ShipmentResult> {
    if (!input.trackingNumber?.trim()) {
      throw new Error("GEL Express: Tracking-Nummer ist erforderlich");
    }
    return { trackingNumber: input.trackingNumber.trim() };
  }
}
