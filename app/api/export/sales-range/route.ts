import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

function formatDE(d: Date) {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);
  const von = req.nextUrl.searchParams.get("von") ?? today;
  const bis = req.nextUrl.searchParams.get("bis") ?? today;

  const from = new Date(`${von}T00:00:00`);
  const to = new Date(`${bis}T23:59:59`);

  const [items, sales] = await Promise.all([
    prisma.item.findMany({ orderBy: { createdAt: "asc" }, select: { sku: true } }),
    prisma.sale.findMany({ where: { date: { gte: from, lte: to } }, orderBy: { date: "asc" } }),
  ]);

  // Build sorted list of unique dates in range
  const dateSet = new Set<string>();
  const cur = new Date(from);
  while (cur <= to) {
    dateSet.add(dateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  const dates = Array.from(dateSet);

  // Pivot: sku → dateKey → total quantity
  const pivot = new Map<string, Map<string, number>>();
  for (const s of sales) {
    const dk = dateKey(new Date(s.date));
    if (!pivot.has(s.sku)) pivot.set(s.sku, new Map());
    const inner = pivot.get(s.sku)!;
    inner.set(dk, (inner.get(dk) ?? 0) + s.quantity);
  }

  const dateLabels = dates.map((d) => formatDE(new Date(d)));

  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([
    ["SKU", ...dateLabels],
    ...items.map((i) => [
      i.sku,
      ...dates.map((d) => pivot.get(i.sku)?.get(d) ?? 0),
    ]),
  ]);
  ws["!cols"] = [{ wch: 24 }, ...dates.map(() => ({ wch: 10 }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Verkäufe");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="verkaufe-${von}-${bis}.xlsx"`,
    },
  });
}
