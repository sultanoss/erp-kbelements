"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parseOrderPi, buildOrderPi } from "./utils";

export async function toggleGeplantCheck(id: string, checked: boolean) {
  const supabase = await createClient();
  const { data } = await supabase.from("ware_in_china").select("order_pi_nummer").eq("id", id).single();
  if (!data) return;
  const { datum, typ } = parseOrderPi(data.order_pi_nummer);
  await supabase
    .from("ware_in_china")
    .update({ order_pi_nummer: buildOrderPi(datum, typ, checked), updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/china/geplante-bestellungen");
}
