"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";

export type PurchaseOrderInput = {
  date: string;
  supplier: string;
  invoiceNumber: string;
  notes?: string;
  items: { sku: string; quantity: number; purchasePrice: number }[];
};

export type SaveResult = {
  ok: boolean;
  purchaseOrderId: string;
  itemsUpdated: number;
};

export async function savePurchaseOrder(data: PurchaseOrderInput): Promise<SaveResult> {
  const user = await requireAdmin();

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.create({
      data: {
        date: new Date(`${data.date}T12:00:00`),
        supplier: data.supplier,
        invoiceNumber: data.invoiceNumber,
        notes: data.notes || null,
        userId: user.id,
      },
    });

    for (const line of data.items) {
      const item = await tx.item.findUniqueOrThrow({ where: { sku: line.sku } });
      const oldStock = item.stock;
      const oldPurchasePrice = item.purchasePrice;
      const newStock = oldStock + line.quantity;
      const newAvgPrice =
        oldStock > 0 && oldPurchasePrice != null
          ? (oldStock * oldPurchasePrice + line.quantity * line.purchasePrice) / newStock
          : line.purchasePrice;

      await tx.purchaseOrderItem.create({
        data: {
          purchaseOrderId: order.id,
          sku: line.sku,
          quantity: line.quantity,
          purchasePrice: line.purchasePrice,
          oldPurchasePrice: oldPurchasePrice,
          oldStock,
        },
      });

      await tx.purchasePriceHistory.create({
        data: {
          sku: line.sku,
          date: new Date(`${data.date}T12:00:00`),
          supplier: data.supplier,
          invoiceNumber: data.invoiceNumber,
          quantity: line.quantity,
          purchasePrice: line.purchasePrice,
          purchaseOrderId: order.id,
        },
      });

      await tx.item.update({
        where: { sku: line.sku },
        data: { stock: newStock, purchasePrice: newAvgPrice },
      });
    }

    return order.id;
  });

  revalidatePath("/");
  revalidatePath("/b2b/einkauf");
  revalidatePath("/inventory");

  return { ok: true, purchaseOrderId: result, itemsUpdated: data.items.length };
}

export async function undoPurchaseOrder(purchaseOrderId: string): Promise<{ done: boolean }> {
  await requireAdmin();

  const order = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: purchaseOrderId },
    include: { items: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const line of order.items) {
      await tx.item.update({
        where: { sku: line.sku },
        data: {
          stock: line.oldStock,
          purchasePrice: line.oldPurchasePrice,
        },
      });
    }

    await tx.purchasePriceHistory.deleteMany({ where: { purchaseOrderId } });
    await tx.purchaseOrder.delete({ where: { id: purchaseOrderId } });
  });

  revalidatePath("/");
  revalidatePath("/b2b/einkauf");
  revalidatePath("/inventory");

  return { done: true };
}
