import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);
  const date = req.nextUrl.searchParams.get("date") ?? today;

  const from = new Date(`${date}T00:00:00`);
  const to = new Date(`${date}T23:59:59`);

  const [items, sales] = await Promise.all([
    prisma.item.findMany({ orderBy: { createdAt: "asc" }, select: { sku: true } }),
    prisma.sale.findMany({ where: { date: { gte: from, lte: to } } }),
  ]);

  const soldMap = new Map<string, number>();
  for (const s of sales) {
    soldMap.set(s.sku, (soldMap.get(s.sku) ?? 0) + s.quantity);
  }

  const dateLabel = new Date(from).toLocaleDateString("de-DE");

  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([
    ["Datum", "SKU", "Menge"],
    ...items.map((i) => [dateLabel, i.sku, soldMap.get(i.sku) ?? 0]),
  ]);
  ws["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 8 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Verkäufe");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="verkaufe-${date}.xlsx"`,
    },
  });
}
