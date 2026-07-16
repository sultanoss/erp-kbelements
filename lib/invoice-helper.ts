import { prisma } from "./prisma";
import type { Order, OrderItem } from "@prisma/client";
import type { InvWithItems } from "./invoice-pdf";

export async function createInvoiceFromOrder(
  order: Order & { items: OrderItem[] },
  userId: string,
): Promise<InvWithItems> {
  // Idempotent: return existing invoice if one already exists for this order
  const existing = await prisma.invoice.findFirst({
    where: { orderId: order.id },
    include: { items: { orderBy: { pos: "asc" }, include: { skus: true } } },
  });
  if (existing) return existing;

  const prefix = "KBR-";
  const last = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix }, docType: "rechnung" },
    orderBy: { number: "desc" },
  });
  const seq = last ? parseInt(last.number.replace(prefix, ""), 10) + 1 : 2601;
  const number = `${prefix}${String(seq).padStart(4, "0")}`;

  const customerAddress = [
    order.billingStreet ?? order.street,
    `${order.billingZip ?? order.zip} ${order.billingCity ?? order.city}`,
    order.billingCountry ?? order.country,
  ].filter(Boolean).join("\n");

  const inv = await prisma.invoice.create({
    data: {
      number,
      date: new Date(),
      customerName: order.billingName ?? order.customerName,
      customerAddress,
      customerNum: null,
      mwstRate: 19,
      shippingCost: null,
      shippingMwst: 19,
      paymentMethod: "konto",
      notes: null,
      paymentInfo: null,
      docType: "rechnung",
      marketplace: order.marketplace,
      orderId: order.id,
      userId,
      items: {
        create: order.items.map((item, i) => ({
          pos: i + 1,
          quantity: item.quantity,
          description: item.title,
          unitPrice: item.price,
          skus: { create: [] },
        })),
      },
    },
    include: { items: { orderBy: { pos: "asc" }, include: { skus: true } } },
  });

  return inv;
}
