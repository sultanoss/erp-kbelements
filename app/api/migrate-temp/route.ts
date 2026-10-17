import { NextResponse } from "next/server";

const MIGRATION_SQL = `ALTER TABLE china_bestellungen ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;`;

export async function GET(req: Request) {
  const secret = req.headers.get("x-migrate-secret");
  if (secret !== process.env.CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const projectRef = supabaseUrl.split("//")[1].split(".")[0];

  const results: Record<string, unknown> = {};

  // Method 1: Management API
  try {
    const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: MIGRATION_SQL }),
    });
    const mgmtBody = await mgmtRes.json().catch(() => ({}));
    results["management_api"] = { status: mgmtRes.status, body: mgmtBody };
    if (mgmtRes.ok) {
      return NextResponse.json({ success: true, method: "management_api", results });
    }
  } catch (e) {
    results["management_api"] = { error: String(e) };
  }

  // Method 2: exec_sql RPC
  try {
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: MIGRATION_SQL }),
    });
    const rpcBody = await rpcRes.json().catch(() => ({}));
    results["exec_sql_rpc"] = { status: rpcRes.status, body: rpcBody };
    if (rpcRes.ok) {
      return NextResponse.json({ success: true, method: "exec_sql_rpc", results });
    }
  } catch (e) {
    results["exec_sql_rpc"] = { error: String(e) };
  }

  const envKeys = Object.keys(process.env).filter(k =>
    k.toLowerCase().includes("postgres") ||
    k.toLowerCase().includes("database") ||
    k.toLowerCase().includes("supabase") ||
    k.toLowerCase().includes("db_")
  );
  results["available_env_keys"] = envKeys;

  return NextResponse.json({ success: false, message: "No method worked", results });
}
