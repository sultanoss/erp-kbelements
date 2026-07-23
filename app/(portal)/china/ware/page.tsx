import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/status";
import WareFilterBar from "./WareFilterBar";

interface SearchParams { q?: string; }

export default async function WareInChinaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("ware_in_china")
    .select("*, ware_in_china_artikel(*)")
    .order("created_at", { ascending: false });

  if (params.q) {
    query = query.or(`fabrik.ilike.%${params.q}%,order_pi_nummer.ilike.%${params.q}%`);
  }

  const { data: waren, error } = await query;

  const cell = "block px-4 py-3";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Ware in China</h1>
          <p className="text-stone-500 text-sm mt-0.5">{waren?.length ?? 0} Einträge</p>
        </div>
        <Link href="/china/ware/new" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neue Ware
        </Link>
      </div>

      <WareFilterBar defaults={{ q: params.q ?? "" }} />

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
                <th className="text-left px-4 py-3 font-medium text-stone-600">Fabrik</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Order / PI</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Artikel</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Erstellt von</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!waren?.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-stone-400">
                    {params.q ? "Keine Einträge für diese Suche." : "Noch keine Ware eingetragen."}
                  </td>
                </tr>
              ) : (
                waren.map((w) => {
                  const href = `/china/ware/${w.id}`;
                  const artikel: Array<{ artikel: string; anzahl: number }> = w.ware_in_china_artikel ?? [];
                  const artikelText = artikel.length
                    ? artikel.map((a) => `${a.artikel}${a.anzahl > 1 ? ` ×${a.anzahl}` : ""}`).join(", ")
                    : null;
                  return (
                    <tr key={w.id} className="hover:bg-stone-50 transition-colors cursor-pointer">
                      <td className="p-0 text-xs text-stone-500 whitespace-nowrap">
                        <Link href={href} className={cell}>{formatDate(w.created_at)}</Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={`${cell} text-stone-700`}>
                          {w.fabrik || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0 font-mono text-xs">
                        <Link href={href} className={`${cell} text-stone-700`}>
                          {w.order_pi_nummer || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0 max-w-sm">
                        <Link href={href} className={`${cell} text-stone-600 truncate block`}>
                          {artikelText || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0 text-xs text-stone-500">
                        <Link href={href} className={cell}>{w.created_by}</Link>
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
