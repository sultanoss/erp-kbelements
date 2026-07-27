import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";

export async function GET() {
  await requireUser();

  const items = await prisma.item.findMany({
    select: { sku: true, name: true, stock: true, stockNS: true },
    orderBy: { sku: "asc" },
  });

  const date = new Date().toISOString().slice(0, 10);
  const rows = [
    ["SKU", "Bezeichnung", "Neuware-Lager", "NS-Lager"],
    ...items.map((i) => [i.sku, i.name, String(i.stock), String(i.stockNS)]),
  ];

  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lager-export-${date}.csv"`,
    },
  });
}
