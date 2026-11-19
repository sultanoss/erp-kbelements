import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ReturnsFilterBar from "./ReturnsFilterBar";
import ReturnsListClient from "./ReturnsListClient";

interface SearchParams {
  q?: string;
  from?: string;
  to?: string;
  status?: string;
  resolution?: string;
  outlet?: string;
}

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("returns")
    .select("*, return_items(sku, quantity, is_manual)")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (params.q) {
    const q = params.q;
    query = query.or(
      `order_number.ilike.%${q}%,description.ilike.%${q}%,received_by.ilike.%${q}%,resolved_by.ilike.%${q}%,resolution_notes.ilike.%${q}%,tracking_number.ilike.%${q}%`
    );
  }
  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) query = query.lte("created_at", params.to + "T23:59:59");
  if (params.status) query = query.eq("status", params.status);
  if (params.resolution) query = query.eq("resolution", params.resolution);
  if (params.outlet === "1") query = query.eq("is_outlet", true);

  const [{ data: allReturns, error }, { data: { user: currentUser } }] = await Promise.all([
    query,
    supabase.auth.getUser(),
  ]);

  const returns = allReturns?.filter(r =>
    !r.resolution_notes?.startsWith("REPARATUR:") &&
    (params.status === "bei_reparatur" || r.status !== "bei_reparatur")
  ) ?? [];
  const currentUserName = currentUser?.user_metadata?.full_name ?? currentUser?.email ?? "";
  const hasFilters = !!(params.q || params.status || params.resolution || params.from || params.to || params.outlet);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Retouren</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {returns.length} Einträge
          </p>
        </div>
        <Link href="/returns/new" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neue Retoure
        </Link>
      </div>

      <ReturnsFilterBar defaults={{
        q: params.q ?? "",
        status: params.status ?? "",
        resolution: params.resolution ?? "",
        from: params.from ?? "",
        to: params.to ?? "",
        outlet: params.outlet ?? "",
      }} />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
          Fehler beim Laden: {error.message}
        </div>
      )}

      <ReturnsListClient
        returns={returns as never}
        currentUserName={currentUserName}
        hasFilters={hasFilters}
      />
    </div>
  );
}
