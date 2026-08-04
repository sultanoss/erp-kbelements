import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, TASK_TYPE_LABELS, formatDate } from "@/lib/status";
import { unarchiveTask } from "../actions";

interface SearchParams { q?: string; von?: string; bis?: string; }

export default async function ArchivAufgabenPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();

  const q = params.q?.trim() ?? "";
  const von = params.von ?? "";
  const bis = params.bis ?? "";

  // Suche in Chatverlauf (separate Query, dann IDs zusammenführen)
  let replyIds: string[] = [];
  if (q) {
    const { data: replies } = await supabase
      .from("task_replies")
      .select("task_id")
      .ilike("content", `%${q}%`);
    replyIds = [...new Set(replies?.map((r) => r.task_id) ?? [])];
  }

  let query = supabase
    .from("tasks")
    .select("*")
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  if (von) query = query.gte("created_at", von);
  if (bis) query = query.lte("created_at", bis + "T23:59:59");

  if (q) {
    const orParts = [
      `description.ilike.%${q}%`,
      `created_by.ilike.%${q}%`,
      `sendungsnummer.ilike.%${q}%`,
    ];
    if (replyIds.length > 0) orParts.push(`id.in.(${replyIds.join(",")})`);
    query = query.or(orParts.join(","));
  }

  const { data: tasks } = await query;

  const hasFilter = q || von || bis;
  const cell = "px-4 py-3";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Aufgaben Archiv</h1>
          <p className="text-stone-500 text-sm mt-0.5">{tasks?.length ?? 0} Einträge</p>
        </div>
        <Link href="/tasks" className="btn-secondary text-sm">Zur Aufgabenliste</Link>
      </div>

      {/* Filterleiste */}
      <form method="GET" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5 flex-1 min-w-[200px]">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">Suche</span>
          <input
            name="q"
            type="text"
            defaultValue={q}
            placeholder="Name, Beschreibung, Sendungsnummer, Chat..."
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
          <Link href="/archiv/aufgaben" className="h-10 inline-flex items-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
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
                <th className="text-left px-4 py-3 font-medium text-stone-600">Tag</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 max-w-[280px]">Beschreibung</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Erstellt von</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!tasks?.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-stone-400">
                    {hasFilter ? "Keine Ergebnisse für diese Suche." : "Keine archivierten Aufgaben vorhanden."}
                  </td>
                </tr>
              ) : (
                tasks.map((t) => {
                  const status = STATUS_LABELS[t.status] ?? { label: t.status, className: "bg-stone-100 text-stone-600" };
                  const tags: string[] = t.tags ?? [];
                  const unarchiveWithId = unarchiveTask.bind(null, t.id);
                  return (
                    <tr key={t.id} className="hover:bg-stone-50 transition-colors">
                      <td className={`${cell} text-stone-500 whitespace-nowrap text-xs`}>
                        {t.archived_at ? formatDate(t.archived_at) : "—"}
                      </td>
                      <td className={cell}>
                        <div className="flex flex-wrap gap-1">
                          {tags.length > 0 ? tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-stone-100 text-stone-700">
                              {TASK_TYPE_LABELS[tag] ?? tag}
                            </span>
                          )) : <span className="text-stone-300">—</span>}
                        </div>
                      </td>
                      <td className={`${cell} max-w-[280px]`}>
                        <span className="text-xs text-stone-600 line-clamp-2">{t.description}</span>
                      </td>
                      <td className={cell}>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className={`${cell} text-xs text-stone-600`}>
                        {t.created_by || <span className="text-stone-300">—</span>}
                      </td>
                      <td className={`${cell} text-right`}>
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/tasks/${t.id}`} className="text-xs text-stone-500 hover:text-stone-700 underline whitespace-nowrap">
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
