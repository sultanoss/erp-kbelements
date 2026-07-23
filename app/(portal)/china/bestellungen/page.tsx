import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/status";
import ChinaFilterBar from "./ChinaFilterBar";

interface SearchParams {
  q?: string;
  von?: string;
  bis?: string;
  angezahlt?: string;
  bezahlt?: string;
  verschifft?: string;
}

export default async function ChinaBestellungenPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("china_bestellungen")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.q) query = query.or(`order_pi_nummer.ilike.%${params.q}%,fabrik.ilike.%${params.q}%`);
  if (params.von) query = query.gte("created_at", params.von);
  if (params.bis) query = query.lte("created_at", params.bis + "T23:59:59");
  if (params.angezahlt === "ja")   query = query.eq("angezahlt", true);
  if (params.angezahlt === "nein") query = query.eq("angezahlt", false);
  if (params.bezahlt === "ja")     query = query.eq("bezahlt", true);
  if (params.bezahlt === "nein")   query = query.eq("bezahlt", false);
  if (params.verschifft === "ja")  query = query.eq("verschifft", true);
  if (params.verschifft === "nein")query = query.eq("verschifft", false);

  const { data: bestellungen, error } = await query;

  const cell = "block px-4 py-3";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">China Bestellungen</h1>
          <p className="text-stone-500 text-sm mt-0.5">{bestellungen?.length ?? 0} Einträge</p>
        </div>
        <Link href="/china/bestellungen/new" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neue Bestellung
        </Link>
      </div>

      <ChinaFilterBar
        defaults={{
          q: params.q ?? "",
          von: params.von ?? "",
          bis: params.bis ?? "",
          angezahlt: params.angezahlt ?? "",
          bezahlt: params.bezahlt ?? "",
          verschifft: params.verschifft ?? "",
        }}
      />

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
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!bestellungen?.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-stone-400">
                    {Object.values(params).some(Boolean)
                      ? "Keine Bestellungen für diese Filterkriterien."
                      : "Noch keine Bestellungen. Erstelle die erste Bestellung."}
                  </td>
                </tr>
              ) : (
                bestellungen.map((b) => {
                  const href = `/china/bestellungen/${b.id}`;
                  return (
                    <tr key={b.id} className="hover:bg-stone-50 transition-colors cursor-pointer">
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
