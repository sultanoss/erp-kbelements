"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function deleteErsatzteil(id: string) {
  const supabase = await createClient();

  const { data: files } = await supabase.storage.from("china-media").list(`ersatzteile/${id}`);
  if (files && files.length > 0) {
    const paths = files.map((f) => `ersatzteile/${id}/${f.name}`);
    await supabase.storage.from("china-media").remove(paths);
  }

  await supabase.from("ware_in_china").delete().eq("id", id);
  redirect("/china/ersatzteile");
}
