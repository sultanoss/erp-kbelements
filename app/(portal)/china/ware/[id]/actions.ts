"use server";

import { createClient } from "@/lib/supabase/server";

export async function deleteWare(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Mediendateien aus Storage löschen
  const { data: mediaRows } = await supabase
    .from("ware_media")
    .select("storage_path")
    .eq("ware_id", id);

  if (mediaRows && mediaRows.length > 0) {
    const paths = mediaRows.map((m) => m.storage_path);
    await supabase.storage.from("china-media").remove(paths);
    await supabase.from("ware_media").delete().eq("ware_id", id);
  }

  await supabase.from("ware_in_china_artikel").delete().eq("ware_id", id);
  const { error } = await supabase.from("ware_in_china").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}
