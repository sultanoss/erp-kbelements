import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/status";

function parseErsatzteil(orderPi: string | null): string {
  if (!orderPi?.startsWith("ERSATZTEIL:")) return "";
  return orderPi.slice(11);
}

export default async function ErsatzteileListPage() {
  const supabase = await createClient();

  const { data: eintraege } = await supabase
    .from("ware_in_china")
    .select("*")
    .like("order_pi_nummer", "ERSATZTEIL:%")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Ersatzteile</h1>
          <p className="text-stone-500 text-sm mt-0.5">{eintraege?.length ?? 0} Einträge</p>
        </div>
        <Link href="/china/ersatzteile/new" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neu anlegen
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-4 py-3 font-medium text-stone-600">Produkt</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Fabrik</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Notiz</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Erstellt von</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!eintraege?.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-stone-400">
                    Noch keine Einträge.
                  </td>
                </tr>
              ) : (
                eintraege.map((e) => {
                  const href = `/china/ersatzteile/${e.id}`;
                  const produkt = parseErsatzteil(e.order_pi_nummer);
                  return (
                    <tr key={e.id} className="hover:bg-stone-50 transition-colors cursor-pointer">
                      <td className="p-0 font-medium">
                        <Link href={href} className="block px-4 py-3 text-stone-800">
                          {produkt || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className="block px-4 py-3 text-stone-600">
                          {e.fabrik || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0 max-w-xs">
                        <Link href={href} className="block px-4 py-3 text-stone-500 truncate">
                          {e.notiz || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0 text-xs text-stone-500">
                        <Link href={href} className="block px-4 py-3">{e.created_by}</Link>
                      </td>
                      <td className="p-0 text-xs text-stone-400 whitespace-nowrap">
                        <Link href={href} className="block px-4 py-3">{formatDate(e.created_at)}</Link>
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
