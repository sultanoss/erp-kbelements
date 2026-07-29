"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";

export async function updatePurchasePrice(sku: string, price: number | null) {
  await requireAdmin();
  await prisma.item.update({
    where: { sku },
    data: { purchasePrice: price },
  });
  revalidatePath("/b2b/preisliste");
  revalidatePath("/b2b/einkauf");
}

export async function addPriceColumn(title: string): Promise<{ id: string; title: string; order: number }> {
  await requireAdmin();
  const count = await prisma.priceColumn.count();
  const col = await prisma.priceColumn.create({
    data: { title, order: count },
  });
  revalidatePath("/b2b/preisliste");
  return { id: col.id, title: col.title, order: col.order };
}

export async function deletePriceColumn(id: string) {
  await requireAdmin();
  await prisma.priceColumn.delete({ where: { id } });
  revalidatePath("/b2b/preisliste");
}

export async function updateColumnValue(priceColumnId: string, sku: string, price: number | null) {
  await requireAdmin();
  await prisma.priceColumnValue.upsert({
    where: { priceColumnId_sku: { priceColumnId, sku } },
    create: { priceColumnId, sku, price },
    update: { price },
  });
  revalidatePath("/b2b/preisliste");
}

export async function updateItemMeta(
  sku: string,
  data: { description?: string; highlights?: string; scopeOfDelivery?: string }
) {
  await requireAdmin();
  await prisma.item.update({ where: { sku }, data });
}
