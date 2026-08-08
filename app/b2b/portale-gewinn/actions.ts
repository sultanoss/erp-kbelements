"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveExtraCosts(costs: Record<string, number | null>) {
  const clean: Record<string, number> = {};
  for (const [sku, val] of Object.entries(costs)) {
    if (val != null && !isNaN(val)) clean[sku] = val;
  }
  await prisma.setting.upsert({
    where: { key: "PORTAL_EXTRA_COSTS" },
    update: { value: JSON.stringify(clean) },
    create: { key: "PORTAL_EXTRA_COSTS", value: JSON.stringify(clean) },
  });
  revalidatePath("/b2b/portale-gewinn");
}
