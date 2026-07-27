import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== "kb-backfill-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { date: { gte: todayStart } },
    select: { sku: true, quantity: true, marketplace: true },
  });

  // Group by marketplace
  const direkt = sales.filter(s => s.marketplace === "DIREKT");
  const versand = sales.filter(s => s.marketplace !== "DIREKT");

  const direktTotal = direkt.reduce((s, r) => s + r.quantity, 0);
  const versandTotal = versand.reduce((s, r) => s + r.quantity, 0);

  // Group versand by SKU
  const versandBySku: Record<string, number> = {};
  for (const s of versand) {
    versandBySku[s.sku] = (versandBySku[s.sku] ?? 0) + s.quantity;
  }

  // Group direkt by SKU
  const direktBySku: Record<string, number> = {};
  for (const s of direkt) {
    direktBySku[s.sku] = (direktBySku[s.sku] ?? 0) + s.quantity;
  }

  return NextResponse.json({
    total: sales.reduce((s, r) => s + r.quantity, 0),
    direktTotal,
    versandTotal,
    direktBySku,
    versandBySku: Object.entries(versandBySku)
      .sort((a, b) => b[1] - a[1])
      .map(([sku, qty]) => ({ sku, qty })),
  });
}
