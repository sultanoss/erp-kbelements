import { prisma } from "@/lib/prisma";

const BASE = "https://mediamarktsaturn.mirakl.net/api";

function authHeaders(): Record<string, string> {
  const key = process.env.MEDIAMARKT_API_KEY ?? "";
  return { Authorization: key, Accept: "application/json" };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const states = searchParams.get("states") ?? "WAITING_ACCEPTANCE,WAITING_DEBIT,WAITING_DEBIT_PAYMENT,SHIPPING";

  // MediaMarkt orders in DB
  const dbCount = await prisma.order.count({ where: { marketplace: "MEDIAMARKT" } });
  const dbOrders = await prisma.order.findMany({
    where: { marketplace: "MEDIAMARKT" },
    select: { externalId: true, orderNumber: true, orderDate: true },
    orderBy: { orderDate: "desc" },
    take: 30,
  });

  // MediaMarkt orders from API (all pages)
  const apiOrders: { order_id: string; commercial_id: string; created_date: string; order_state: string }[] = [];
  let offset = 0;
  let apiTotal = 0;
  let apiError: string | null = null;

  try {
    for (;;) {
      const url = `${BASE}/orders?order_state_codes=${states}&max=100&offset=${offset}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) { apiError = `HTTP ${res.status}: ${await res.text()}`; break; }
      const data = await res.json() as { orders?: typeof apiOrders; total_count?: number };
      apiTotal = data.total_count ?? 0;
      const page = data.orders ?? [];
      apiOrders.push(...page);
      if (page.length < 100) break;
      offset += 100;
    }
  } catch (e) {
    apiError = String(e);
  }

  // Find which API orders are missing from DB
  const dbIds = new Set(dbOrders.map(o => o.externalId));
  const missing = apiOrders.filter(o => !dbIds.has(o.order_id));

  return Response.json({
    db_total_mediamarkt: dbCount,
    db_recent: dbOrders,
    api_total: apiTotal,
    api_fetched: apiOrders.length,
    api_error: apiError,
    missing_from_db: missing.map(o => ({ order_id: o.order_id, commercial_id: o.commercial_id, created_date: o.created_date, state: o.order_state })),
  });
}
