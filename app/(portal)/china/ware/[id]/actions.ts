"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function deleteWare(id: string) {
  const supabase = await createClient();
  await supabase.from("ware_in_china_artikel").delete().eq("ware_id", id);
  const { error } = await supabase.from("ware_in_china").delete().eq("id", id);
  if (error) throw new Error(error.message);
  redirect("/china/ware");
}
