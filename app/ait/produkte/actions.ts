"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function updateAitDimensions(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");

  const sku = formData.get("sku") as string;
  const aitWeight = formData.get("aitWeight") ? parseFloat(formData.get("aitWeight") as string) : null;
  const aitHeight = formData.get("aitHeight") ? parseInt(formData.get("aitHeight") as string, 10) : null;
  const aitWidth  = formData.get("aitWidth")  ? parseInt(formData.get("aitWidth")  as string, 10) : null;
  const aitDepth  = formData.get("aitDepth")  ? parseInt(formData.get("aitDepth")  as string, 10) : null;

  await prisma.item.update({
    where: { sku },
    data: { aitWeight, aitHeight, aitWidth, aitDepth },
  });

  revalidatePath("/ait/produkte");
}
