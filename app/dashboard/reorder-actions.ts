"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";

export async function upsertChinaLager(sku: string, quantity: number) {
  await requireUser();
  const existing = await prisma.skuIncoming.findFirst({ where: { sku, type: "CHINA_LAGER" } });
  if (existing) {
    if (quantity <= 0) {
      await prisma.skuIncoming.delete({ where: { id: existing.id } });
    } else {
      await prisma.skuIncoming.update({ where: { id: existing.id }, data: { quantity } });
    }
  } else if (quantity > 0) {
    await prisma.skuIncoming.create({ data: { sku, type: "CHINA_LAGER", quantity } });
  }
  revalidatePath("/");
}

export async function addUnterwegs(sku: string, quantity: number, arrivalDate: string) {
  await requireUser();
  await prisma.skuIncoming.create({
    data: { sku, type: "UNTERWEGS", quantity, arrivalDate: new Date(arrivalDate) },
  });
  revalidatePath("/");
}

export async function deleteIncoming(id: string) {
  await requireUser();
  await prisma.skuIncoming.delete({ where: { id } });
  revalidatePath("/");
}
