import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, TASK_TYPE_LABELS, formatDate } from "@/lib/status";
import { unarchiveTask } from "../actions";

export default async function ArchivAufgabenPage() {
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  const cell = "px-4 py-3";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Aufgaben Archiv</h1>
          <p className="text-stone-500 text-sm mt-0.5">{tasks?.length ?? 0} archivierte Einträge</p>
        </div>
        <Link href="/tasks" className="btn-secondary text-sm">
          Zur Aufgabenliste
        </Link>
      </div>

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
                    Keine archivierten Aufgaben vorhanden.
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
                            <button
                              type="submit"
                              className="inline-flex items-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors whitespace-nowrap"
                            >
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
