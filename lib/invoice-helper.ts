import { prisma } from "./prisma";
import type { Order, OrderItem } from "@prisma/client";
import type { InvWithItems } from "./invoice-pdf";

function mwstFuerLand(country?: string | null): number {
  return country === "AT" || country === "FR" ? 20 : 19;
}

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

  const customerAddress = [
    order.billingStreet ?? order.street,
    `${order.billingZip ?? order.zip} ${order.billingCity ?? order.city}`,
    order.billingCountry ?? order.country,
  ].filter(Boolean).join("\n");

  const inv = await prisma.$transaction(async (tx) => {
    // pg_advisory_xact_lock: blocks concurrent callers with the same key until
    // this transaction commits — prevents duplicate KBR numbers and customerNums
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(555444333)`;

    // KBR number — inside lock so no two invoices get the same number
    const last = await tx.invoice.findFirst({
      where: { number: { startsWith: "KBR-" }, docType: "rechnung" },
      orderBy: { number: "desc" },
    });
    const seq = last ? parseInt(last.number.replace("KBR-", ""), 10) + 1 : 2601;
    const number = `KBR-${String(seq).padStart(4, "0")}`;

    // Customer number — inside same lock so no two invoices get the same KN-xx
    const year = new Date().getFullYear().toString().slice(-2);
    const cnPrefix = `KN-${year}-`;
    const [b2bList, b2cList, invoiceList] = await Promise.all([
      tx.b2bCustomer.findMany({ where: { customerNum: { startsWith: cnPrefix } }, select: { customerNum: true } }),
      tx.b2cCustomer.findMany({ where: { customerNum: { startsWith: cnPrefix } }, select: { customerNum: true } }),
      tx.invoice.findMany({ where: { customerNum: { startsWith: cnPrefix } }, select: { customerNum: true } }),
    ]);
    const allNums = [...b2bList, ...b2cList, ...invoiceList]
      .map((c) => parseInt(c.customerNum!.replace(cnPrefix, ""), 10))
      .filter((n) => !isNaN(n));
    const nextNum = allNums.length > 0 ? Math.max(...allNums) + 1 : 3;
    const customerNum = `${cnPrefix}${String(nextNum).padStart(2, "0")}`;

    return tx.invoice.create({
      data: {
        number,
        date: new Date(),
        customerName: order.billingName ?? order.customerName,
        customerAddress,
        customerNum,
        mwstRate: mwstFuerLand(order.billingCountry ?? order.country),
        shippingCost: null,
        shippingMwst: mwstFuerLand(order.billingCountry ?? order.country),
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
  });

  // ActivityLog: Rechnung erstellt
  await prisma.activityLog.create({
    data: {
      type: "INVOICE",
      note: `${inv.number} · ${order.marketplace}${order.orderNumber ? ` #${order.orderNumber}` : ""}`,
      userId,
    },
  });

  return inv;
}
