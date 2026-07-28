import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, RESOLUTION_LABELS, formatDate } from "@/lib/status";
import ReturnsFilterBar from "./ReturnsFilterBar";

interface SearchParams {
  q?: string;
  from?: string;
  to?: string;
  status?: string;
  resolution?: string;
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
  if (params.resolution) query = query.eq("resolution", params.resolution);

  const [{ data: returns, error }, { data: { user: currentUser } }] = await Promise.all([
    query,
    supabase.auth.getUser(),
  ]);

  const currentUserName = currentUser?.user_metadata?.full_name ?? currentUser?.email ?? "";

  const cell = "block px-4 py-3";

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

      <ReturnsFilterBar defaults={{
        q: params.q ?? "",
        status: params.status ?? "",
        resolution: params.resolution ?? "",
        from: params.from ?? "",
        to: params.to ?? "",
      }} />

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
                <th className="text-left px-4 py-3 font-medium text-stone-600">Sendungsnummer</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Abschluss</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Erstattung</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Bearbeiter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!returns?.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-stone-400">
                    {params.q || params.status || params.resolution || params.from || params.to
                      ? "Keine Retouren für diese Filterkriterien gefunden."
                      : "Noch keine Retouren vorhanden. Erstelle die erste Retoure."}
                  </td>
                </tr>
              ) : (
                returns.map((r) => {
                  const href = `/returns/${r.id}`;
                  const items = (r.return_items as Array<{ sku: string; quantity: number; is_manual: boolean }>) ?? [];
                  const skuList = items.map(i => `${i.sku}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ");
                  const status = STATUS_LABELS[r.status] ?? { label: r.status, className: "bg-stone-100 text-stone-600" };
                  const resolution = r.resolution ? RESOLUTION_LABELS[r.resolution] : null;
                  const bearbeiter = r.status === "erledigt" ? r.resolved_by : r.received_by;
                  const hasNewReply = !!r.last_reply_at && !!r.last_reply_author && r.last_reply_author !== currentUserName;

                  return (
                    <tr key={r.id} className="hover:bg-stone-50 transition-colors cursor-pointer">
                      <td className="p-0 text-stone-500 whitespace-nowrap text-xs">
                        <Link href={href} className={cell}>{formatDate(r.created_at)}</Link>
                      </td>
                      <td className="p-0 font-mono text-xs whitespace-nowrap">
                        <Link href={href} className={`${cell} text-stone-700`}>
                          {r.order_number || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={cell}>
                          <span className="text-xs text-stone-600 font-medium">
                            {skuList || <span className="text-stone-300">—</span>}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0 max-w-[200px]">
                        <Link href={href} className={cell}>
                          <span className="text-xs text-stone-600 line-clamp-2">
                            {r.description || <span className="text-stone-300">—</span>}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={cell}>
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                              {status.label}
                            </span>
                            {hasNewReply && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 flex-shrink-0 rounded-full bg-blue-500 animate-pulse" />
                                Neue Antwort von {r.last_reply_author}
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={`${cell} font-mono text-xs text-stone-600`}>
                          {r.tracking_number || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={cell}>
                          {resolution ? (
                            <span className="text-xs text-stone-600 font-medium">{resolution}</span>
                          ) : (
                            <span className="text-stone-300 text-xs">—</span>
                          )}
                        </Link>
                      </td>
                      {/* Erstattung — not a link so tooltip works */}
                      <td className="px-4 py-3">
                        {r.refund_status === "ja" ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                            ✓ Ja
                          </span>
                        ) : r.refund_status === "nein" ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                              ✗ Nein
                            </span>
                            {r.refund_reason && (
                              <span className="relative group cursor-default">
                                <svg className="w-3.5 h-3.5 text-stone-400 hover:text-stone-600 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <span className="absolute left-0 bottom-full mb-1.5 w-52 rounded-lg bg-stone-800 text-white text-xs px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-normal shadow-lg">
                                  {r.refund_reason}
                                </span>
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-stone-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-0 whitespace-nowrap">
                        <Link href={href} className={`${cell} text-xs text-stone-600`}>
                          {bearbeiter || <span className="text-stone-300">—</span>}
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
