import { NextResponse } from "next/server";

const MIGRATION_SQL = `
ALTER TABLE returns ADD COLUMN IF NOT EXISTS reparatur_status TEXT;

DO $$
DECLARE
  cname text;
BEGIN
  SELECT constraint_name INTO cname
  FROM information_schema.table_constraints
  WHERE table_name = 'returns'
    AND constraint_type = 'CHECK'
    AND constraint_name ILIKE '%status%'
  LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE returns DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END $$;

ALTER TABLE returns ADD CONSTRAINT IF NOT EXISTS returns_status_check CHECK (
  status IN (
    'eingegangen','in_bearbeitung','erledigt',
    'nicht_zustellbar','wieder_an_kunde','klaeren_mit_kunde',
    'garantie','austausch','warte_auf_kunde_antwort','reparatur'
  )
);
`;

export async function GET(req: Request) {
  const secret = req.headers.get("x-migrate-secret");
  if (secret !== process.env.CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const projectRef = supabaseUrl.split("//")[1].split(".")[0];

  const results: Record<string, unknown> = {};

  // Method 1: Management API with service role key (works if it's actually a PAT)
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

  // Method 2: pg_net style — call supabase exec_sql if it exists
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

  // Method 3: Check what environment we have
  const envKeys = Object.keys(process.env).filter(k =>
    k.toLowerCase().includes("postgres") ||
    k.toLowerCase().includes("database") ||
    k.toLowerCase().includes("supabase") ||
    k.toLowerCase().includes("db_")
  );
  results["available_env_keys"] = envKeys;
  results["service_key_prefix"] = serviceKey.substring(0, 20);

  return NextResponse.json({
    success: false,
    message: "No migration method worked — check results",
    results
  });
}
