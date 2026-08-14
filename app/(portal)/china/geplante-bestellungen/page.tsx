import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function extractDatum(orderPi: string | null): string {
  if (!orderPi?.startsWith("DATUM:")) return "";
  return orderPi.slice(6);
}

function fmtDate(d: string) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}.${m}.${y}`;
}

export default async function GeplanteBestellungenPage() {
  const supabase = await createClient();

  const { data: bestellungen } = await supabase
    .from("ware_in_china")
    .select("*, ware_in_china_artikel(artikel, anzahl)")
    .like("order_pi_nummer", "DATUM:%")
    .order("order_pi_nummer", { ascending: true });

  const today = new Date().toISOString().slice(0, 10);
  const soonDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Geplante Bestellungen</h1>
          <p className="text-stone-500 text-sm mt-0.5">{bestellungen?.length ?? 0} Einträge · sortiert nach Datum</p>
        </div>
        <Link href="/china/geplante-bestellungen/new" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neue Bestellung
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-4 py-3 font-medium text-stone-600">Geplant am</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Fabrik</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Artikel</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Erstellt von</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!bestellungen?.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-stone-400">
                    Noch keine geplanten Bestellungen.
                  </td>
                </tr>
              ) : (
                bestellungen.map((b) => {
                  const href = `/china/geplante-bestellungen/${b.id}`;
                  const datum = extractDatum(b.order_pi_nummer);
                  const artikel: Array<{ artikel: string; anzahl: number }> = b.ware_in_china_artikel ?? [];
                  const artikelText = artikel.length
                    ? artikel.map((a) => `${a.artikel}${a.anzahl > 1 ? ` ×${a.anzahl}` : ""}`).join(", ")
                    : null;
                  const overdue = datum < today;
                  const soon = !overdue && datum <= soonDate;
                  return (
                    <tr key={b.id} className="hover:bg-stone-50 transition-colors cursor-pointer">
                      <td className="p-0 whitespace-nowrap">
                        <Link href={href} className="flex items-center gap-2 px-4 py-3">
                          <span className={`font-medium tabular-nums ${overdue ? "text-red-600" : soon ? "text-amber-600" : "text-stone-700"}`}>
                            {fmtDate(datum)}
                          </span>
                          {overdue && <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Überfällig</span>}
                          {soon && <span className="text-[10px] font-semibold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">Bald</span>}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className="block px-4 py-3 text-stone-700">
                          {b.fabrik || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0 max-w-sm">
                        <Link href={href} className="block px-4 py-3 text-stone-600 truncate">
                          {artikelText || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0 text-xs text-stone-500">
                        <Link href={href} className="block px-4 py-3">{b.created_by}</Link>
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
