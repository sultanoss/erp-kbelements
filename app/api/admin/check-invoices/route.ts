import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const nums = new URL(request.url).searchParams.get("numbers")?.split(",") ?? [];

  const invoices = await prisma.invoice.findMany({
    where: { number: { in: nums } },
    include: { items: { include: { skus: true } } },
  });

  const result = await Promise.all(invoices.map(async (inv) => {
    const skuList: { sku: string; lager: string; quantity: number; currentStock: number; currentStockNS: number }[] = [];
    for (const item of inv.items) {
      for (const s of item.skus) {
        const dbItem = await prisma.item.findUnique({ where: { sku: s.sku } });
        skuList.push({
          sku: s.sku,
          lager: s.lager,
          quantity: item.quantity,
          currentStock: dbItem?.stock ?? -1,
          currentStockNS: dbItem?.stockNS ?? -1,
        });
      }
    }
    return {
      number: inv.number,
      date: inv.date,
      status: inv.status,
      customerName: inv.customerName,
      skus: skuList,
    };
  }));

  return NextResponse.json(result);
}
