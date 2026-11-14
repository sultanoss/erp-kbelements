"use server";

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function deleteReturn(returnId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await adminSupabase.from("return_replies").delete().eq("return_id", returnId);
  await adminSupabase.from("return_images").delete().eq("return_id", returnId);
  await adminSupabase.from("return_events").delete().eq("return_id", returnId);
  await adminSupabase.from("return_items").delete().eq("return_id", returnId);
  await adminSupabase.from("returns").delete().eq("id", returnId);

  redirect("/returns");
}

export async function archiveReturn(returnId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await adminSupabase.from("returns").update({ archived_at: new Date().toISOString() }).eq("id", returnId);
  redirect("/returns");
}

export async function archiveReturnsBulk(ids: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await adminSupabase
    .from("returns")
    .update({ archived_at: new Date().toISOString() })
    .in("id", ids);
  revalidatePath("/returns");
  revalidatePath("/archiv/retouren");
}

export async function clearReturnBadge(returnId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await adminSupabase
    .from("returns")
    .update({ last_reply_at: null, last_reply_author: null })
    .eq("id", returnId);
}
