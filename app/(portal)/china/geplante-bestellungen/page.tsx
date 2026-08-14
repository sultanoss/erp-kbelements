import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { GeplantTyp } from "./utils";
import { parseOrderPi } from "./utils";
import CheckToggle from "./CheckToggle";

function fmtDate(d: string) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}.${m}.${y}`;
}

function TypBadge({ typ }: { typ: GeplantTyp }) {
  if (typ === "LOADING") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">
        Loading
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600 uppercase tracking-wide">
      Order
    </span>
  );
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
          <h1 className="text-2xl font-bold text-stone-900">Bestellungen / Loading</h1>
          <p className="text-stone-500 text-sm mt-0.5">{bestellungen?.length ?? 0} Einträge · sortiert nach Datum</p>
        </div>
        <Link href="/china/geplante-bestellungen/new" className="btn-primary">
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
                <th className="text-left px-4 py-3 font-medium text-stone-600">Typ</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Geplant am</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Fabrik</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Artikel</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Erstellt von</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!bestellungen?.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-stone-400">
                    Noch keine Einträge.
                  </td>
                </tr>
              ) : (
                bestellungen.map((b) => {
                  const href = `/china/geplante-bestellungen/${b.id}`;
                  const { datum, typ, checked } = parseOrderPi(b.order_pi_nummer);
                  const artikel: Array<{ artikel: string; anzahl: number }> = b.ware_in_china_artikel ?? [];
                  const artikelText = artikel.length
                    ? artikel.map((a) => `${a.artikel}${a.anzahl > 1 ? ` ×${a.anzahl}` : ""}`).join(", ")
                    : null;
                  const overdue = datum < today;
                  const soon = !overdue && datum <= soonDate;
                  return (
                    <tr key={b.id} className={`hover:bg-stone-50 transition-colors cursor-pointer ${checked ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link href={href} className="inline-flex">
                            <TypBadge typ={typ} />
                          </Link>
                          <CheckToggle id={b.id} checked={checked} />
                        </div>
                      </td>
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
