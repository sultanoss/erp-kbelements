"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteBestellung(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Storage-Dateien holen und löschen
  const { data: mediaRows } = await supabase
    .from("china_media")
    .select("storage_path")
    .eq("bestellung_id", id);

  if (mediaRows && mediaRows.length > 0) {
    await supabase.storage
      .from("china-media")
      .remove(mediaRows.map((m: { storage_path: string }) => m.storage_path));
  }

  // Media-Zeilen löschen (mit Fehlerprüfung)
  const { error: mediaError } = await supabase
    .from("china_media")
    .delete()
    .eq("bestellung_id", id);
  if (mediaError) return { error: mediaError.message };

  // Bestellung löschen
  const { error } = await supabase
    .from("china_bestellungen")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/china/bestellungen");
  return {};
}
