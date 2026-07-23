import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SCHADEN_STATUS_LABELS, formatDate } from "@/lib/status";
import SchadenFilterBar from "./SchadenFilterBar";
import ExportButton from "./ExportButton";

interface SearchParams {
  q?: string;
  status?: string;
  unterlagen?: string;
  von?: string;
  bis?: string;
}

export default async function SchadenmeldungenPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("schadenmeldungen")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.q) {
    const q = params.q;
    query = query.or(
      `gel_nummer.ilike.%${q}%,auftragsnummer.ilike.%${q}%,rechnungsnummer.ilike.%${q}%`
    );
  }
  if (params.status) query = query.eq("status", params.status);
  if (params.unterlagen === "1") query = query.eq("unterlagen_gesendet", true);
  if (params.unterlagen === "0") query = query.eq("unterlagen_gesendet", false);
  if (params.von) query = query.gte("created_at", params.von);
  if (params.bis) query = query.lte("created_at", params.bis + "T23:59:59");

  const { data: rows, error } = await query;

  const cell = "block px-4 py-3";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Schadenmeldungen</h1>
          <p className="text-stone-500 text-sm mt-0.5">{rows?.length ?? 0} Einträge</p>
        </div>
        <div className="flex gap-2">
          <ExportButton rows={rows ?? []} />
          <Link href="/schadenmeldungen/new" className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neue Meldung
          </Link>
        </div>
      </div>

      <SchadenFilterBar defaults={{
        q: params.q ?? "",
        status: params.status ?? "",
        unterlagen: params.unterlagen ?? "",
        von: params.von ?? "",
        bis: params.bis ?? "",
      }} />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
          Fehler: {error.message}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-4 py-3 font-medium text-stone-600">Datum</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">GEL-Nr</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Auftragsnummer</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 max-w-[200px]">Artikel</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Unterlagen an GEL</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Rechnungsnummer</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Erstellt von</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!rows?.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-stone-400">
                    {params.q || params.status || params.unterlagen || params.von || params.bis
                      ? "Keine Meldungen für diese Filterkriterien."
                      : "Noch keine Schadenmeldungen vorhanden."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const href = `/schadenmeldungen/${r.id}`;
                  const status = SCHADEN_STATUS_LABELS[r.status] ?? { label: r.status, className: "bg-stone-100 text-stone-600" };
                  return (
                    <tr key={r.id} className="hover:bg-stone-50 transition-colors cursor-pointer">
                      <td className="p-0 text-stone-500 whitespace-nowrap text-xs">
                        <Link href={href} className={cell}>{formatDate(r.created_at)}</Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={`${cell} font-mono text-xs font-medium text-stone-800`}>{r.gel_nummer}</Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={`${cell} text-xs text-stone-600`}>{r.auftragsnummer || <span className="text-stone-300">—</span>}</Link>
                      </td>
                      <td className="p-0 max-w-[200px]">
                        <Link href={href} className={cell}>
                          <span className="text-xs text-stone-600 line-clamp-1">{r.artikel || <span className="text-stone-300">—</span>}</span>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={cell}>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                            {status.label}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={cell}>
                          {r.unterlagen_gesendet ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              Ja
                            </span>
                          ) : (
                            <span className="text-xs text-stone-400">Nein</span>
                          )}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={`${cell} text-xs font-mono text-stone-600`}>{r.rechnungsnummer || <span className="text-stone-300">—</span>}</Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={`${cell} text-xs text-stone-600`}>{r.created_by}</Link>
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
