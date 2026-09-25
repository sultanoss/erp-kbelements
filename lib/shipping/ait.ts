const BASE_URL = process.env.AIT_API_URL ?? "https://client-api.uk.aithomedelivery.com/apiv2/public";
const SCHEMA_ID = parseInt(process.env.AIT_SCHEMA_ID ?? "16592", 10);

function getKey(): string {
  const key = process.env.AIT_API_KEY;
  if (!key) throw new Error("AIT_API_KEY nicht konfiguriert");
  return key;
}

async function aitPost<T = unknown>(action: string, body: Record<string, unknown>): Promise<T> {
  const key = getKey();
  const url = `${BASE_URL}/${action}`;
  const fullBody = { key, json: "1", schemaid: SCHEMA_ID, ...body };

  const logBody = { ...fullBody, key: "[REDACTED]" };
  console.log(`[AIT ${new Date().toISOString()}] POST /${action}`, JSON.stringify(logBody));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fullBody),
  });

  const text = await res.text();
  console.log(`[AIT ${new Date().toISOString()}] /${action} →`, text.slice(0, 500));

  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { parsed = text; }

  if (!res.ok) {
    const p = typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {};
    const detail = Array.isArray(p.validation_errors)
      ? (p.validation_errors as string[]).join("; ")
      : (p.error as string | undefined) ?? `HTTP ${res.status}`;
    throw new Error(`AIT Fehler (${p.code ?? res.status}): ${detail}`);
  }

  // HTTP 200 aber Fehler im Body (z.B. code 454)
  if (typeof parsed === "object" && parsed !== null && "code" in (parsed as object)) {
    const p = parsed as Record<string, unknown>;
    const detail = Array.isArray(p.validation_errors)
      ? (p.validation_errors as string[]).join("; ")
      : (p.error as string | undefined) ?? "Unbekannter Fehler";
    throw new Error(`AIT Fehler (${p.code}): ${detail}`);
  }

  return parsed as T;
}

export async function createAitOrder(params: {
  consignmentNo: string;
  clientOrderNo: string;
  customer: { name: string; street: string; zip: string; city: string; phone: string; email: string };
  items: Array<{ sku: string; description: string; quantity: number; weight: number; cube: number; height: number; width: number; depth: number }>;
  disposal: boolean;
  serviceType?: number;
}): Promise<void> {
  if (!params.customer.phone?.trim()) {
    throw new Error("Keine Telefonnummer in der Bestellung — AIT benötigt eine Telefonnummer für die Lieferterminvereinbarung");
  }

  await aitPost("create_order", {
    consignmentno: params.consignmentNo,
    clientorderno: params.clientOrderNo,
    deliveryname: params.customer.name,
    deliveryaddress1: params.customer.street,
    deliveryaddress2: params.customer.city,
    deliverypostcode: params.customer.zip,
    deliverycountrycode: "DEU",
    deliverytelephone1: params.customer.phone,
    deliveryemail: params.customer.email || "",
    deliverydate: "",
    servicetype: params.serviceType ?? 2,
    extraservicetypes: params.disposal ? ["D"] : [],
    lines: params.items.map((i) => ({
      productdescription: i.description,
      productcode: i.sku,
      noofitems: String(i.quantity),
      packageqty: String(i.quantity),
      suppliername: "AIT",
      stockdepot: "Hannover",
      trackingid: "",
      weight: parseFloat((i.weight * i.quantity).toFixed(2)).toString(),
      cube: parseFloat((i.cube * i.quantity).toFixed(3)).toString(),
      height: String(i.height),
      width: String(i.width),
      depth: String(i.depth),
    })),
  });
}

export interface AitOrderData {
  selfServiceId?: string;
  trackingIds: string[];
}

export async function getAitOrder(consignmentNo: string): Promise<AitOrderData> {
  const result = await aitPost("get_order", { consignmentno: consignmentNo });

  if (typeof result !== "object" || result === null) return { trackingIds: [] };

  const data = result as Record<string, unknown>;
  const order = (typeof data.order === "object" && data.order !== null)
    ? data.order as Record<string, unknown>
    : data;

  // Mehrere mögliche Feldnamen für SelfServiceId probieren
  const selfServiceId =
    (order.selfserviceid as string | undefined) ??
    (order.selfServiceId as string | undefined) ??
    (order.SelfServiceId as string | undefined) ??
    (order.self_service_id as string | undefined);

  const linesRaw: unknown[] = Array.isArray(order.lines) ? order.lines : [];
  const trackingIds = linesRaw
    .filter((l): l is Record<string, unknown> => typeof l === "object" && l !== null)
    .map((l) => l.trackingid as string | undefined)
    .filter((t): t is string => !!t && t !== "");

  return { selfServiceId: selfServiceId || undefined, trackingIds };
}
