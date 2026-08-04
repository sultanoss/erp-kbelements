import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, RESOLUTION_LABELS, formatDate } from "@/lib/status";
import { unarchiveReturn } from "../actions";

interface SearchParams { q?: string; von?: string; bis?: string; }

export default async function ArchivRetourenPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();

  const q = params.q?.trim() ?? "";
  const von = params.von ?? "";
  const bis = params.bis ?? "";

  // Suche in Chatverlauf + SKUs (separate Queries, dann IDs zusammenführen)
  let extraIds: string[] = [];
  if (q) {
    const [{ data: replies }, { data: items }] = await Promise.all([
      supabase.from("return_replies").select("return_id").ilike("content", `%${q}%`),
      supabase.from("return_items").select("return_id").ilike("sku", `%${q}%`),
    ]);
    extraIds = [...new Set([
      ...(replies?.map((r) => r.return_id) ?? []),
      ...(items?.map((i) => i.return_id) ?? []),
    ])];
  }

  let query = supabase
    .from("returns")
    .select("*, return_items(sku, quantity, is_manual)")
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  if (von) query = query.gte("created_at", von);
  if (bis) query = query.lte("created_at", bis + "T23:59:59");

  if (q) {
    const orParts = [
      `order_number.ilike.%${q}%`,
      `description.ilike.%${q}%`,
      `received_by.ilike.%${q}%`,
      `resolved_by.ilike.%${q}%`,
      `resolution_notes.ilike.%${q}%`,
    ];
    if (extraIds.length > 0) orParts.push(`id.in.(${extraIds.join(",")})`);
    query = query.or(orParts.join(","));
  }

  const { data: returns } = await query;

  const hasFilter = q || von || bis;
  const cell = "px-4 py-3";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Retouren Archiv</h1>
          <p className="text-stone-500 text-sm mt-0.5">{returns?.length ?? 0} Einträge</p>
        </div>
        <Link href="/returns" className="btn-secondary text-sm">Zur Retourenliste</Link>
      </div>

      {/* Filterleiste */}
      <form method="GET" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5 flex-1 min-w-[200px]">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">Suche</span>
          <input
            name="q"
            type="text"
            defaultValue={q}
            placeholder="Auftragsnr., Name, SKU, Beschreibung, Chat..."
            className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-800 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">Von</span>
          <input
            name="von"
            type="date"
            defaultValue={von}
            className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-800 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">Bis</span>
          <input
            name="bis"
            type="date"
            defaultValue={bis}
            className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-800 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
          />
        </label>
        <button type="submit" className="h-10 rounded-lg bg-stone-800 px-4 text-sm font-semibold text-white hover:bg-stone-900 transition-colors">
          Suchen
        </button>
        {hasFilter && (
          <Link href="/archiv/retouren" className="h-10 inline-flex items-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
            Zurücksetzen
          </Link>
        )}
      </form>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-4 py-3 font-medium text-stone-600">Archiviert am</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Auftrag</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">SKUs</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 max-w-[180px]">Beschreibung</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Abschluss</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Bearbeiter</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!returns?.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-stone-400">
                    {hasFilter ? "Keine Ergebnisse für diese Suche." : "Keine archivierten Retouren vorhanden."}
                  </td>
                </tr>
              ) : (
                returns.map((r) => {
                  const items = (r.return_items as Array<{ sku: string; quantity: number; is_manual: boolean }>) ?? [];
                  const skuList = items.map((i) => `${i.sku}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ");
                  const status = STATUS_LABELS[r.status] ?? { label: r.status, className: "bg-stone-100 text-stone-600" };
                  const resolution = r.resolution ? RESOLUTION_LABELS[r.resolution] : null;
                  const bearbeiter = r.status === "erledigt" ? r.resolved_by : r.received_by;
                  const unarchiveWithId = unarchiveReturn.bind(null, r.id);
                  return (
                    <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                      <td className={`${cell} text-stone-500 whitespace-nowrap text-xs`}>
                        {r.archived_at ? formatDate(r.archived_at) : "—"}
                      </td>
                      <td className={`${cell} font-mono text-xs text-stone-700 whitespace-nowrap`}>
                        {r.order_number || <span className="text-stone-300">—</span>}
                      </td>
                      <td className={cell}>
                        <span className="text-xs text-stone-600 font-medium">
                          {skuList || <span className="text-stone-300">—</span>}
                        </span>
                      </td>
                      <td className={`${cell} max-w-[180px]`}>
                        <span className="text-xs text-stone-600 line-clamp-2">
                          {r.description || <span className="text-stone-300">—</span>}
                        </span>
                      </td>
                      <td className={cell}>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className={`${cell} text-xs text-stone-600`}>
                        {resolution || <span className="text-stone-300">—</span>}
                      </td>
                      <td className={`${cell} text-xs text-stone-600 whitespace-nowrap`}>
                        {bearbeiter || <span className="text-stone-300">—</span>}
                      </td>
                      <td className={`${cell} text-right`}>
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/returns/${r.id}`} className="text-xs text-stone-500 hover:text-stone-700 underline whitespace-nowrap">
                            Öffnen
                          </Link>
                          <form action={unarchiveWithId}>
                            <button type="submit" className="inline-flex items-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors whitespace-nowrap">
                              Wiederherstellen
                            </button>
                          </form>
                        </div>
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
