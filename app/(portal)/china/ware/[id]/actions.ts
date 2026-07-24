"use server";

import { createClient } from "@/lib/supabase/server";

export async function deleteWare(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  await supabase.from("ware_in_china_artikel").delete().eq("ware_id", id);
  const { error } = await supabase.from("ware_in_china").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}
