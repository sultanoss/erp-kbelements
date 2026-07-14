"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function markAsAbgeschlossen(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.order.update({ where: { id }, data: { status: "ABGESCHLOSSEN" } });
  revalidatePath(`/bestellungen/${id}`);
  revalidatePath("/bestellungen");
  revalidatePath("/");
}
