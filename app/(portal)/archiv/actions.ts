"use server";

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function unarchiveTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await adminSupabase.from("tasks").update({ archived_at: null }).eq("id", taskId);
  redirect("/archiv/aufgaben");
}

export async function unarchiveReturn(returnId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await adminSupabase.from("returns").update({ archived_at: null }).eq("id", returnId);
  redirect("/archiv/retouren");
}
