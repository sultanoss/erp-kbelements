import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Marketplace } from "@prisma/client";

// Creates Sale records for shipments from the last 7 days (before today)
// that were marked salesCreated=true by the backfill but never got Sale records.
// Safe to run: those shipments never had Sales created (all were salesCreated=false before backfill).
export async function POST(req: Request) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== "kb-backfill-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 7);
  windowStart.setHours(0, 0, 0, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const shipments = await prisma.shipment.findMany({
    where: {
      salesCreated: true,
      createdAt: { gte: windowStart, lt: todayStart },
    },
    include: { order: true, items: true },
  });

  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!adminUser) return NextResponse.json({ error: "No admin user found" }, { status: 500 });

  const details: string[] = [];
  let created = 0;

  for (const shipment of shipments) {
    const marketplace = shipment.order.marketplace as Marketplace;
    for (const item of shipment.items) {
      await prisma.sale.create({
        data: {
          date: new Date(),
          marketplace,
          sku: item.internalSku,
          quantity: item.quantity,
          source: item.warehouse === "ns" ? "NS_LAGER" : "TAGESVERKAUF",
          userId: adminUser.id,
        },
      });
      created++;
      details.push(`${item.internalSku} x${item.quantity}`);
    }
  }

  return NextResponse.json({ ok: true, shipments: shipments.length, created, details });
}
