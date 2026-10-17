import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/status";

export default async function ChinaBestellungenArchivPage() {
  const supabase = await createClient();

  const { data: bestellungen, error } = await supabase
    .from("china_bestellungen")
    .select("*")
    .eq("archived", true)
    .order("created_at", { ascending: false });

  const cell = "block px-4 py-3";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-stone-500 mb-1">
            <Link href="/china/bestellungen" className="hover:text-stone-700 transition-colors">China Bestellungen</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-stone-700 font-medium">Archiv</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Archiv</h1>
          <p className="text-stone-500 text-sm mt-0.5">{bestellungen?.length ?? 0} archivierte Bestellungen</p>
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
                <th className="text-left px-4 py-3 font-medium text-stone-600">Order / PI</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Fabrik</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Angezahlt</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Bezahlt</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Verschifft</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Lager Ankunft</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Abgeladen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!bestellungen?.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-stone-400">
                    Keine archivierten Bestellungen.
                  </td>
                </tr>
              ) : (
                bestellungen.map((b) => {
                  const href = `/china/bestellungen/${b.id}`;
                  return (
                    <tr key={b.id} className="hover:bg-stone-50 transition-colors cursor-pointer opacity-75">
                      <td className="p-0 text-stone-500 whitespace-nowrap text-xs">
                        <Link href={href} className={cell}>{formatDate(b.created_at)}</Link>
                      </td>
                      <td className="p-0 font-mono text-xs">
                        <Link href={href} className={`${cell} text-stone-700`}>
                          {b.order_pi_nummer || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={`${cell} text-stone-700`}>
                          {b.fabrik || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={cell}>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.angezahlt ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                            {b.angezahlt ? "Ja" : "Nein"}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={cell}>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.bezahlt ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                            {b.bezahlt ? "Ja" : "Nein"}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={cell}>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.verschifft ? "bg-blue-100 text-blue-700" : "bg-stone-100 text-stone-500"}`}>
                            {b.verschifft ? "Ja" : "Nein"}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0 text-xs">
                        <Link href={href} className={`${cell} text-stone-600`}>
                          {b.lager_ankunft
                            ? new Date(b.lager_ankunft).toLocaleDateString("de-DE")
                            : <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={cell}>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.abgeladen ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                            {b.abgeladen ? "Ja" : "Nein"}
                          </span>
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
