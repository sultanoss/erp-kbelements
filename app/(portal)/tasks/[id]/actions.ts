"use server";

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await adminSupabase.from("task_media").delete().eq("task_id", taskId);
  await adminSupabase.from("task_replies").delete().eq("task_id", taskId);
  await adminSupabase.from("tasks").delete().eq("id", taskId);

  redirect("/tasks");
}

export async function archiveTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await adminSupabase.from("tasks").update({ archived_at: new Date().toISOString() }).eq("id", taskId);
  redirect("/tasks");
}

export async function clearTaskBadge(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await adminSupabase
    .from("tasks")
    .update({ last_reply_at: null, last_reply_author: null })
    .eq("id", taskId);
}
