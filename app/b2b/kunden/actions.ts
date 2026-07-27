"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";

export type CustomerInput = {
  name: string;
  customerNum?: string;
  address: string;
  mwstRate: number;
  paymentMethod: "konto" | "bar";
  paymentInfo?: string;
  notes?: string;
};

export async function createCustomer(data: CustomerInput) {
  await requireAdmin();
  await prisma.b2bCustomer.create({
    data: {
      name: data.name,
      customerNum: data.customerNum || null,
      address: data.address,
      mwstRate: data.mwstRate,
      paymentMethod: data.paymentMethod,
      paymentInfo: data.paymentInfo || null,
      notes: data.notes || null,
    },
  });
  revalidatePath("/b2b/kunden");
}

export async function deleteCustomer(id: string) {
  await requireAdmin();
  await prisma.b2bCustomer.delete({ where: { id } });
  revalidatePath("/b2b/kunden");
}
