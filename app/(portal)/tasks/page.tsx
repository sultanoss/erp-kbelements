import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { STATUS_LABELS, TASK_TYPE_LABELS, formatDate } from "@/lib/status";
import TasksFilterBar from "./TasksFilterBar";

interface SearchParams {
  q?: string;
  status?: string;
  type?: string;
  from?: string;
  to?: string;
  assigned_to?: string;
  created_by?: string;
  urgent?: string;
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.q) {
    const q = params.q;
    query = query.or(`description.ilike.%${q}%,created_by.ilike.%${q}%`);
  }
  if (params.status) query = query.eq("status", params.status);
  if (params.type) query = query.contains("tags", [params.type]);
  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) query = query.lte("created_at", params.to + "T23:59:59");
  if (params.assigned_to) query = query.contains("assigned_to", [params.assigned_to]);
  if (params.created_by) query = query.ilike("created_by", `%${params.created_by}%`);
  if (params.urgent === "1") query = query.eq("is_urgent", true);

  const [{ data: tasks, error }, { data: { users } }] = await Promise.all([
    query,
    adminSupabase.auth.admin.listUsers(),
  ]);

  const userList = (users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    full_name: (u.user_metadata?.full_name as string) ?? "",
  }));

  const userNameByEmail = Object.fromEntries(
    userList.map((u) => [u.email, u.full_name || u.email])
  );

  const cell = "block px-4 py-3";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Aufgaben</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {tasks?.length ?? 0} Einträge
          </p>
        </div>
        <Link href="/tasks/new" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neue Aufgabe
        </Link>
      </div>

      <TasksFilterBar
        defaults={{
          q: params.q ?? "",
          status: params.status ?? "",
          type: params.type ?? "",
          from: params.from ?? "",
          to: params.to ?? "",
          assigned_to: params.assigned_to ?? "",
          created_by: params.created_by ?? "",
          urgent: params.urgent ?? "",
        }}
        users={userList}
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
                <th className="text-left px-4 py-3 font-medium text-stone-600">Tag</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 max-w-[280px]">Beschreibung</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Zugewiesen an</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Sendungsnummer</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Erstellt von</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!tasks?.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-stone-400">
                    {params.q || params.status || params.type || params.from || params.to || params.assigned_to || params.urgent
                      ? "Keine Aufgaben für diese Filterkriterien gefunden."
                      : "Noch keine Aufgaben vorhanden. Erstelle die erste Aufgabe."}
                  </td>
                </tr>
              ) : (
                tasks.map((t) => {
                  const href = `/tasks/${t.id}`;
                  const status = STATUS_LABELS[t.status] ?? { label: t.status, className: "bg-stone-100 text-stone-600" };
                  const tags: string[] = t.tags ?? [];
                  const assigned: string[] = t.assigned_to ?? [];
                  const urgent: boolean = t.is_urgent ?? false;

                  return (
                    <tr key={t.id} className={`hover:bg-stone-50 transition-colors cursor-pointer ${urgent ? "border-l-2 border-l-red-500" : ""}`}>
                      <td className="p-0 text-stone-500 whitespace-nowrap text-xs">
                        <Link href={href} className={cell}>{formatDate(t.created_at)}</Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={cell}>
                          <div className="flex flex-wrap gap-1">
                            {urgent && (
                              <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 whitespace-nowrap">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                Dringend
                              </span>
                            )}
                            {tags.length > 0 ? tags.map((tag) => (
                              <span key={tag} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-stone-100 text-stone-700 whitespace-nowrap">
                                {TASK_TYPE_LABELS[tag] ?? tag}
                              </span>
                            )) : (!urgent && <span className="text-stone-300">—</span>)}
                          </div>
                        </Link>
                      </td>
                      <td className="p-0 max-w-[280px]">
                        <Link href={href} className={cell}>
                          <span className="text-xs text-stone-600 line-clamp-2">{t.description}</span>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={`${cell} text-xs text-stone-600`}>
                          {assigned.length > 0
                            ? assigned.map((e) => userNameByEmail[e] || e).join(", ")
                            : <span className="text-stone-300">—</span>}
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
                        <Link href={href} className={`${cell} font-mono text-xs text-stone-600`}>
                          {t.sendungsnummer || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={`${cell} text-xs text-stone-600`}>
                          {t.created_by || <span className="text-stone-300">—</span>}
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
