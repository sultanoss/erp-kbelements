"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function deleteBestellung(id: string) {
  const supabase = await createClient();
  await supabase.from("china_media").delete().eq("bestellung_id", id);
  const { error } = await supabase.from("china_bestellungen").delete().eq("id", id);
  if (error) throw new Error(error.message);
  redirect("/china/bestellungen");
}
