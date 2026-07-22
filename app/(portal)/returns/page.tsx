import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, RESOLUTION_LABELS, formatDate } from "@/lib/status";

interface SearchParams {
  q?: string;
  from?: string;
  to?: string;
  status?: string;
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
    .order("created_at", { ascending: false });

  if (params.q) {
    const q = params.q;
    query = query.or(
      `order_number.ilike.%${q}%,description.ilike.%${q}%,received_by.ilike.%${q}%,resolved_by.ilike.%${q}%,resolution_notes.ilike.%${q}%`
    );
  }
  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) query = query.lte("created_at", params.to + "T23:59:59");
  if (params.status) query = query.eq("status", params.status);

  const { data: returns, error } = await query;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Retouren</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {returns?.length ?? 0} Einträge
          </p>
        </div>
        <Link href="/returns/new" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neue Retoure
        </Link>
      </div>

      {/* Filter */}
      <div className="card p-4 mb-5">
        <form method="GET" className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Suche (Name, Auftrag, Text)</label>
            <input
              name="q"
              className="input"
              placeholder="Suchen..."
              defaultValue={params.q ?? ""}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" className="input" defaultValue={params.status ?? ""}>
              <option value="">Alle</option>
              <option value="eingegangen">Eingegangen</option>
              <option value="in_bearbeitung">In Bearbeitung</option>
              <option value="erledigt">Erledigt</option>
            </select>
          </div>
          <div>
            <label className="label">Von</label>
            <input type="date" name="from" className="input" defaultValue={params.from ?? ""} />
          </div>
          <div>
            <label className="label">Bis</label>
            <input type="date" name="to" className="input" defaultValue={params.to ?? ""} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Filtern</button>
            <Link href="/returns" className="btn-secondary">Zurücksetzen</Link>
          </div>
        </form>
      </div>

      {/* Table */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
          Fehler beim Laden: {error.message}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-4 py-3 font-medium text-stone-600">Datum</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Auftrag</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">SKUs</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 max-w-[200px]">Beschreibung</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Abschluss</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Bearbeiter</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!returns?.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-stone-400">
                    {params.q || params.status || params.from || params.to
                      ? "Keine Retouren für diese Filterkriterien gefunden."
                      : "Noch keine Retouren vorhanden. Erstelle die erste Retoure."}
                  </td>
                </tr>
              ) : (
                returns.map((r) => {
                  const items = (r.return_items as Array<{ sku: string; quantity: number; is_manual: boolean }>) ?? [];
                  const skuList = items.map(i => `${i.sku}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ");
                  const status = STATUS_LABELS[r.status] ?? { label: r.status, className: "bg-stone-100 text-stone-600" };
                  const resolution = r.resolution ? RESOLUTION_LABELS[r.resolution] : null;
                  const bearbeiter = r.status === "erledigt" ? r.resolved_by : r.received_by;

                  return (
                    <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 text-stone-500 whitespace-nowrap text-xs">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3 text-stone-700 font-mono text-xs whitespace-nowrap">
                        {r.order_number || <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-stone-600 font-medium">
                          {skuList || <span className="text-stone-300">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-xs text-stone-600 line-clamp-2">
                          {r.description || <span className="text-stone-300">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {resolution ? (
                          <span className="text-xs text-stone-600 font-medium">{resolution}</span>
                        ) : (
                          <span className="text-stone-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-600 whitespace-nowrap">
                        {bearbeiter || <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/returns/${r.id}`}
                          className="text-brand-red text-xs font-medium hover:underline whitespace-nowrap"
                        >
                          Details →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
