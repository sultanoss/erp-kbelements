import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import TasksFilterBar from "./TasksFilterBar";
import TasksListRefresher from "./TasksListRefresher";
import TasksListClient from "./TasksListClient";

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
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (params.q) {
    const q = params.q;
    query = query.or(`description.ilike.%${q}%,created_by.ilike.%${q}%,sendungsnummer.ilike.%${q}%`);
  }
  if (params.status) query = query.eq("status", params.status);
  if (params.type) query = query.contains("tags", [params.type]);
  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) query = query.lte("created_at", params.to + "T23:59:59");
  if (params.assigned_to) query = query.contains("assigned_to", [params.assigned_to]);
  if (params.created_by) query = query.ilike("created_by", `%${params.created_by}%`);
  if (params.urgent === "1") query = query.eq("is_urgent", true);

  const [{ data: tasks, error }, { data: { users } }, { data: { user: currentUser } }] = await Promise.all([
    query,
    adminSupabase.auth.admin.listUsers(),
    supabase.auth.getUser(),
  ]);

  const currentUserName = currentUser?.user_metadata?.full_name ?? currentUser?.email ?? "";

  const userList = (users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    full_name: (u.user_metadata?.full_name as string) ?? "",
  }));

  const userNameByEmail = Object.fromEntries(
    userList.map((u) => [u.email, u.full_name || u.email])
  );

  const hasFilters = !!(params.q || params.status || params.type || params.from || params.to || params.assigned_to || params.urgent);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <TasksListRefresher />
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

      <TasksListClient
        tasks={tasks ?? []}
        currentUserName={currentUserName}
        userNameByEmail={userNameByEmail}
        hasFilters={hasFilters}
      />
    </div>
  );
}
