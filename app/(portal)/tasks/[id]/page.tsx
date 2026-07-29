import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { STATUS_LABELS, TASK_TYPE_LABELS, formatDate } from "@/lib/status";
import TaskStatusModal from "./TaskStatusModal";
import TaskEditModal from "./TaskEditModal";
import TaskDeleteButton from "./TaskDeleteButton";
import TaskReplies from "./TaskReplies";
import TaskMedia from "./TaskMedia";
import TaskRealtimeRefresher from "./TaskRealtimeRefresher";
import { AllesErledigtButton } from "./AllesErledigtButton";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: task },
    { data: replies },
    { data: mediaRows },
    { data: { users } },
  ] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", id).single(),
    supabase.from("task_replies").select("*").eq("task_id", id).order("created_at", { ascending: true }),
    supabase.from("task_media").select("*").eq("task_id", id).order("created_at", { ascending: true }),
    adminSupabase.auth.admin.listUsers(),
  ]);

  if (!task) notFound();

  const userName = user.user_metadata?.full_name ?? user.email ?? "";
  const status = STATUS_LABELS[task.status] ?? { label: task.status, className: "bg-stone-100 text-stone-600" };
  const tags: string[] = task.tags ?? [];
  const assignedTo: string[] = task.assigned_to ?? [];
  const isUrgent: boolean = task.is_urgent ?? false;

  const userList = (users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    full_name: (u.user_metadata?.full_name as string) ?? "",
  }));

  const userNameByEmail = Object.fromEntries(
    userList.map((u) => [u.email, u.full_name || u.email])
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <TaskRealtimeRefresher taskId={task.id} />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500 mb-5">
        <Link href="/tasks" className="hover:text-stone-700 transition-colors">Aufgaben</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-stone-700 font-medium truncate max-w-xs">
          {tags.length > 0 ? (TASK_TYPE_LABELS[tags[0]] ?? tags[0]) : "Aufgabe"}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isUrgent && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                Dringend
              </span>
            )}
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-stone-100 text-stone-700">
                {TASK_TYPE_LABELS[tag] ?? tag}
              </span>
            ))}
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
              {status.label}
            </span>
          </div>
          <p className="text-stone-500 text-sm mt-1">
            Erstellt von <strong className="text-stone-700">{task.created_by}</strong> · {formatDate(task.created_at)}
          </p>
          {assignedTo.length > 0 && (
            <p className="text-stone-500 text-sm mt-0.5">
              Zugewiesen an{" "}
              {assignedTo.map((email, i) => (
                <span key={email}>
                  {i > 0 && ", "}
                  <strong className="text-stone-700">{userNameByEmail[email] || email}</strong>
                </span>
              ))}
            </p>
          )}
          {task.sendungsnummer && (
            <p className="text-stone-500 text-sm mt-0.5">
              Sendungsnummer: <strong className="text-stone-700 font-mono">{task.sendungsnummer}</strong>
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap flex-shrink-0">
          {task.last_reply_at && <AllesErledigtButton taskId={task.id} />}
          <TaskDeleteButton taskId={task.id} />
          <TaskEditModal
            taskId={task.id}
            currentTags={tags}
            currentDescription={task.description}
            currentAssignedTo={assignedTo}
            currentIsUrgent={isUrgent}
            currentSendungsnummer={task.sendungsnummer ?? null}
            currentStatus={task.status}
            users={userList}
          />
          {task.status !== "erledigt" && (
            <TaskStatusModal
              taskId={task.id}
              currentStatus={task.status}
              userName={userName}
            />
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card p-4">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Beschreibung</div>
            <p className="text-sm text-stone-700 whitespace-pre-wrap">{task.description}</p>
          </div>

          <TaskMedia
            taskId={task.id}
            userName={userName}
            initialMedia={(mediaRows ?? []).map((m) => ({
              id: m.id,
              storage_path: m.storage_path,
              filename: m.filename,
              media_type: m.media_type as "image" | "video",
            }))}
          />
        </div>

        <div>
          <TaskReplies
            taskId={task.id}
            userName={userName}
            initialReplies={replies ?? []}
          />
        </div>
      </div>
    </div>
  );
}
