"use server";

import { createClient } from "@/lib/supabase/server";

export async function deleteBestellung(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  await supabase.from("china_media").delete().eq("bestellung_id", id);
  const { error } = await supabase.from("china_bestellungen").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}
