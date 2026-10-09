"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

export async function createManualOrder(data: {
  customerName: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  phoneNumber: string;
  items: { sku: string; quantity: number; price: number }[];
}): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  await requireUser();

  if (!data.customerName.trim()) return { ok: false, error: "Kundenname fehlt" };
  if (!data.street.trim()) return { ok: false, error: "Straße fehlt" };
  if (!data.zip.trim()) return { ok: false, error: "PLZ fehlt" };
  if (!data.city.trim()) return { ok: false, error: "Ort fehlt" };
  if (!data.phoneNumber.trim()) return { ok: false, error: "Telefonnummer fehlt" };
  if (!data.items.length) return { ok: false, error: "Mindestens ein Artikel erforderlich" };

  // Next M-AIT-N number
  const existing = await prisma.order.findMany({
    where: { marketplace: "DIREKT", orderNumber: { startsWith: "M-AIT-" } },
    select: { orderNumber: true },
  });
  const nums = existing
    .map((o) => parseInt(o.orderNumber?.replace("M-AIT-", "") ?? "0", 10))
    .filter((n) => !isNaN(n) && n > 0);
  const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  const orderNumber = `M-AIT-${nextNum}`;

  const order = await prisma.order.create({
    data: {
      externalId: `DIREKT-${crypto.randomUUID()}`,
      marketplace: "DIREKT",
      orderNumber,
      status: "NEU",
      orderDate: new Date(),
      customerName: data.customerName.trim(),
      street: data.street.trim(),
      zip: data.zip.trim(),
      city: data.city.trim(),
      country: data.country.trim() || "DE",
      phoneNumber: data.phoneNumber.trim(),
      items: {
        create: data.items.map((item) => ({
          marketplaceSku: item.sku,
          internalSku: item.sku,
          title: item.sku,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    },
  });

  revalidatePath("/bestellungen");
  revalidatePath("/");

  return { ok: true, orderId: order.id };
}
