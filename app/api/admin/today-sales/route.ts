import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== "kb-backfill-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.groupBy({
    by: ["sku"],
    where: { date: { gte: todayStart } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
  });

  const total = sales.reduce((s, r) => s + (r._sum.quantity ?? 0), 0);

  return NextResponse.json({
    total,
    bySku: sales.map(r => ({ sku: r.sku, qty: r._sum.quantity })),
  });
}
