import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function GeplanteBestellungenPage() {
  const supabase = await createClient();

  const { data: bestellungen, error } = await supabase
    .from("geplante_bestellungen")
    .select("*, geplante_bestellungen_artikel(*)")
    .order("datum", { ascending: true });

  const cell = "block px-4 py-3";

  function fmtDate(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function isOverdue(d: string) {
    return new Date(d + "T00:00:00") < new Date(new Date().toDateString());
  }

  function isSoon(d: string) {
    const diff = (new Date(d + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }

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
                  const artikel: Array<{ artikel: string; anzahl: number }> = b.geplante_bestellungen_artikel ?? [];
                  const artikelText = artikel.length
                    ? artikel.map((a) => `${a.artikel}${a.anzahl > 1 ? ` ×${a.anzahl}` : ""}`).join(", ")
                    : null;
                  const overdue = isOverdue(b.datum);
                  const soon = !overdue && isSoon(b.datum);
                  return (
                    <tr key={b.id} className="hover:bg-stone-50 transition-colors cursor-pointer">
                      <td className="p-0 whitespace-nowrap">
                        <Link href={href} className={`${cell} flex items-center gap-2`}>
                          <span className={`font-medium tabular-nums ${overdue ? "text-red-600" : soon ? "text-amber-600" : "text-stone-700"}`}>
                            {fmtDate(b.datum)}
                          </span>
                          {overdue && <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Überfällig</span>}
                          {soon && <span className="text-[10px] font-semibold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">Bald</span>}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={`${cell} text-stone-700`}>
                          {b.fabrik || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0 max-w-sm">
                        <Link href={href} className={`${cell} text-stone-600 truncate block`}>
                          {artikelText || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0 text-xs text-stone-500">
                        <Link href={href} className={cell}>{b.created_by}</Link>
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
