"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function deleteReturn(returnId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("return_replies").delete().eq("return_id", returnId);
  await supabase.from("return_images").delete().eq("return_id", returnId);
  await supabase.from("return_events").delete().eq("return_id", returnId);
  await supabase.from("return_items").delete().eq("return_id", returnId);
  await supabase.from("returns").delete().eq("id", returnId);

  redirect("/returns");
}
