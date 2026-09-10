import { auth } from "@/auth";

const BASE = "https://mediamarktsaturn.mirakl.net/api";

function authHeaders(): Record<string, string> {
  const key = process.env.MEDIAMARKT_API_KEY ?? "";
  return { Authorization: key, Accept: "application/json" };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const states = searchParams.get("states") ?? "WAITING_ACCEPTANCE,WAITING_DEBIT,WAITING_DEBIT_PAYMENT,SHIPPING";

  const url = `${BASE}/orders?order_state_codes=${states}&max=10&offset=0`;
  const res = await fetch(url, { headers: authHeaders() });
  const text = await res.text();

  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }

  return Response.json({ status: res.status, url, data });
}
