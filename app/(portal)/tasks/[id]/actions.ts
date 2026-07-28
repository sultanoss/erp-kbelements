"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("task_media").delete().eq("task_id", taskId);
  await supabase.from("task_replies").delete().eq("task_id", taskId);
  await supabase.from("tasks").delete().eq("id", taskId);

  redirect("/tasks");
}
