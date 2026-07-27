import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Adds the 5 missing VERSAND Sale records from 25.07 shipments shipped today:
// - ELK60PB1 x3 (OTTO, MEDIAMARKT, KAUFLAND)
// - ELK60FB1 x2 (MEDIAMARKT x2)
export async function POST(req: Request) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== "kb-backfill-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!adminUser) return NextResponse.json({ error: "No admin user found" }, { status: 500 });

  const saleDate = new Date();

  const toCreate = [
    { sku: "ELK60PB1", quantity: 1, marketplace: "OTTO" },
    { sku: "ELK60PB1", quantity: 1, marketplace: "MEDIAMARKT" },
    { sku: "ELK60PB1", quantity: 1, marketplace: "KAUFLAND" },
    { sku: "ELK60FB1", quantity: 1, marketplace: "MEDIAMARKT" },
    { sku: "ELK60FB1", quantity: 1, marketplace: "MEDIAMARKT" },
  ] as const;

  const created = [];
  for (const item of toCreate) {
    const sale = await prisma.sale.create({
      data: {
        date: saleDate,
        marketplace: item.marketplace,
        sku: item.sku,
        quantity: item.quantity,
        source: "TAGESVERKAUF",
        userId: adminUser.id,
      },
    });
    created.push({ id: sale.id, sku: item.sku, marketplace: item.marketplace });
  }

  return NextResponse.json({ ok: true, created });
}
