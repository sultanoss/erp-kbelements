export type Carrier = "DHL" | "GEL";

export interface ShipmentItemInput {
  internalSku: string;
  quantity: number;
  warehouse: "neuware" | "ns";
}

export interface ShipmentInput {
  orderId: string;
  carrier: Carrier;
  trackingNumber?: string; // GEL only
  weight?: number;         // DHL only (kg)
  consignee: {
    name: string;
    street: string;
    zip: string;
    city: string;
    country: string;
  };
  items: ShipmentItemInput[];
}

export interface ShipmentResult {
  trackingNumber: string;
  labelUrl?: string;
  returnTrackingNumber?: string;
  returnLabelUrl?: string;
  dhlShipmentId?: string;
  carrierResponse?: unknown;
}

export interface ShippingProvider {
  createShipment(input: ShipmentInput): Promise<ShipmentResult>;
}
