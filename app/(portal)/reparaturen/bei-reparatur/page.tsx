import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/status";

export default async function BeiReparaturPage() {
  const { data: returns, error } = await adminSupabase
    .from("returns")
    .select("*, return_items(sku, quantity)")
    .eq("status", "bei_reparatur")
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  const cell = "block px-4 py-3";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Bei Reparatur</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {returns?.length ?? 0} Retoure{(returns?.length ?? 0) !== 1 ? "n" : ""} mit Status „Bei Reparatur"
          </p>
        </div>
      </div>

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
                <th className="text-left px-4 py-3 font-medium text-stone-600 max-w-[220px]">Beschreibung</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Bearbeiter</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Zuletzt geändert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!returns?.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-stone-400">
                    Keine Retouren mit Status „Bei Reparatur" vorhanden.
                  </td>
                </tr>
              ) : (
                returns.map((r) => {
                  const items = (r.return_items as Array<{ sku: string; quantity: number }>) ?? [];
                  const skuList = items
                    .map((i) => `${i.sku}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`)
                    .join(", ");

                  return (
                    <tr key={r.id} className="hover:bg-rose-50/40 transition-colors">
                      <td className="p-0 text-stone-500 whitespace-nowrap text-xs">
                        <Link href={`/returns/${r.id}`} className={cell}>
                          {formatDate(r.created_at)}
                        </Link>
                      </td>
                      <td className="p-0 font-mono text-xs whitespace-nowrap">
                        <Link href={`/returns/${r.id}`} className={`${cell} text-stone-700`}>
                          {r.order_number || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={`/returns/${r.id}`} className={cell}>
                          <span className="text-xs text-stone-600 font-medium">
                            {skuList || <span className="text-stone-300">—</span>}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0 max-w-[220px]">
                        <Link href={`/returns/${r.id}`} className={cell}>
                          <span className="text-xs text-stone-600 line-clamp-2">
                            {r.description || <span className="text-stone-300">—</span>}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0 whitespace-nowrap">
                        <Link href={`/returns/${r.id}`} className={`${cell} text-xs text-stone-600`}>
                          {r.received_by || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0 text-stone-500 whitespace-nowrap text-xs">
                        <Link href={`/returns/${r.id}`} className={cell}>
                          {r.updated_at ? formatDate(r.updated_at) : <span className="text-stone-300">—</span>}
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
