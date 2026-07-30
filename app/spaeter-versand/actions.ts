"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

type ShipmentData = { orderNumber: string; note: string; shippingDate: string };

export async function createLaterShipment(data: ShipmentData) {
  await requireUser();
  await prisma.laterShipment.create({
    data: {
      orderNumber: data.orderNumber.trim(),
      note: data.note.trim() || null,
      shippingDate: new Date(data.shippingDate + "T12:00:00"),
    },
  });
  revalidatePath("/");
}

export async function updateLaterShipment(id: string, data: ShipmentData) {
  await requireUser();
  await prisma.laterShipment.update({
    where: { id },
    data: {
      orderNumber: data.orderNumber.trim(),
      note: data.note.trim() || null,
      shippingDate: new Date(data.shippingDate + "T12:00:00"),
    },
  });
  revalidatePath("/");
}

export async function deleteLaterShipment(id: string) {
  await requireUser();
  await prisma.laterShipment.delete({ where: { id } });
  revalidatePath("/");
}
