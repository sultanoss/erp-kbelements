import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/status";
import ReparaturStatusButtons from "./ReparaturStatusButtons";

interface SearchParams {
  filter?: string;
}

export default async function ReparaturenPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { filter } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("returns")
    .select("*, return_items(sku, quantity)")
    .ilike("resolution_notes", "REPARATUR:%")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (filter === "wartet_auf_teile") {
    query = query.eq("resolution_notes", "REPARATUR:wartet_auf_teile");
  } else if (filter === "erledigt") {
    query = query.eq("resolution_notes", "REPARATUR:erledigt");
  } else if (filter === "offen") {
    query = query.eq("resolution_notes", "REPARATUR:offen");
  }

  const { data: reparaturen, error } = await query;

  function getReparaturSubStatus(resolutionNotes: string | null): string | null {
    if (!resolutionNotes?.startsWith("REPARATUR:")) return null;
    return resolutionNotes.slice(10) || null;
  }

  const cell = "block px-4 py-3";

  const tabs = [
    { label: "Alle", value: "" },
    { label: "Offen", value: "offen" },
    { label: "Wartet auf Teile", value: "wartet_auf_teile" },
    { label: "Erledigt", value: "erledigt" },
  ];

  function reparaturBadge(status: string | null) {
    if (status === "wartet_auf_teile") {
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
          Wartet auf Teile
        </span>
      );
    }
    if (status === "erledigt") {
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
          Erledigt
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-stone-100 text-stone-500">
        Kein Status
      </span>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Reparaturen</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {reparaturen?.length ?? 0} Einträge
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-5 flex-wrap">
        {tabs.map((tab) => {
          const isActive = (filter ?? "") === tab.value;
          const href = tab.value ? `/reparaturen?filter=${tab.value}` : "/reparaturen";
          return (
            <Link
              key={tab.value}
              href={href}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
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
                <th className="text-left px-4 py-3 font-medium text-stone-600">Auftrag</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">SKUs</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 max-w-[180px]">Beschreibung</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Bearbeiter</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Unter-Status</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!reparaturen?.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-stone-400">
                    Keine Reparaturen vorhanden.
                  </td>
                </tr>
              ) : (
                reparaturen.map((r) => {
                  const items = (r.return_items as Array<{ sku: string; quantity: number }>) ?? [];
                  const skuList = items.map((i) => `${i.sku}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ");

                  return (
                    <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-0 text-stone-500 whitespace-nowrap text-xs">
                        <Link href={`/returns/${r.id}`} className={cell}>
                          {formatDate(r.created_at)}
                        </Link>
                      </td>
                      <td className="p-0 font-mono text-xs whitespace-nowrap">
                        <Link href={`/returns/${r.id}`} className={`${cell} text-stone-700`}>
                          {r.order_number || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={`/returns/${r.id}`} className={cell}>
                          <span className="text-xs text-stone-600 font-medium">
                            {skuList || <span className="text-stone-300">—</span>}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0 max-w-[180px]">
                        <Link href={`/returns/${r.id}`} className={cell}>
                          <span className="text-xs text-stone-600 line-clamp-2">
                            {r.description || <span className="text-stone-300">—</span>}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0 whitespace-nowrap">
                        <Link href={`/returns/${r.id}`} className={`${cell} text-xs text-stone-600`}>
                          {r.received_by || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {reparaturBadge(getReparaturSubStatus(r.resolution_notes))}
                      </td>
                      <td className="px-4 py-3">
                        <ReparaturStatusButtons
                          returnId={r.id}
                          currentReparaturStatus={getReparaturSubStatus(r.resolution_notes)}
                        />
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
