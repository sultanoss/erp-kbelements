"use server";

import { createClient } from "@/lib/supabase/server";

export async function deleteGeplantBestellung(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: storageFiles } = await supabase.storage.from("china-media").list(`geplant/${id}`);
  if (storageFiles && storageFiles.length > 0) {
    const paths = storageFiles
      .filter((f) => f.name !== ".emptyFolderPlaceholder")
      .map((f) => `geplant/${id}/${f.name}`);
    if (paths.length > 0) {
      await supabase.storage.from("china-media").remove(paths);
    }
  }

  await supabase.from("ware_in_china_artikel").delete().eq("ware_id", id);
  const { error } = await supabase.from("ware_in_china").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}
