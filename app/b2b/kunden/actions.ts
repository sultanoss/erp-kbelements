"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { generateCustomerNum } from "@/lib/customer-helper";

export type CustomerInput = {
  name: string;
  customerNum?: string;
  phone?: string;
  address: string;
  mwstRate: number;
  paymentMethod: "konto" | "bar";
  paymentInfo?: string;
  notes?: string;
};

export async function createCustomer(data: CustomerInput): Promise<{ error?: string }> {
  await requireAdmin();
  const customerNum = data.customerNum?.trim() || await generateCustomerNum();

  // Prüfen ob KN bereits in B2B, B2C oder Rechnungen vergeben
  const [existsB2B, existsB2C, existsInv] = await Promise.all([
    prisma.b2bCustomer.findFirst({ where: { customerNum } }),
    prisma.b2cCustomer.findFirst({ where: { customerNum } }),
    prisma.invoice.findFirst({ where: { customerNum } }),
  ]);
  if (existsB2B || existsB2C || existsInv) {
    return { error: `Kundennummer ${customerNum} ist bereits vergeben.` };
  }

  await prisma.b2bCustomer.create({
    data: {
      name: data.name,
      customerNum,
      phone: data.phone || null,
      address: data.address,
      mwstRate: data.mwstRate,
      paymentMethod: data.paymentMethod,
      paymentInfo: data.paymentInfo || null,
      notes: data.notes || null,
    },
  });
  revalidatePath("/b2b/kunden");
  return {};
}

export async function deleteCustomer(id: string) {
  await requireAdmin();
  await prisma.b2bCustomer.delete({ where: { id } });
  revalidatePath("/b2b/kunden");
}
