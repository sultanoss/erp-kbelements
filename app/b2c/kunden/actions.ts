"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function deleteB2cCustomer(id: string) {
  await requireUser();
  await prisma.b2cCustomer.delete({ where: { id } });
  revalidatePath("/b2c/kunden");
}
