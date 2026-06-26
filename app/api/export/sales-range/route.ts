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

function buildPivot(
  sales: { sku: string; quantity: number; date: Date; source: string }[],
  source: string,
  skus: string[],
  dates: string[],
  dateLabels: string[],
  XLSX: typeof import("xlsx"),
) {
  const filtered = sales.filter((s) => s.source === source);
  const pivot = new Map<string, Map<string, number>>();
  for (const s of filtered) {
    const dk = dateKey(new Date(s.date));
    if (!pivot.has(s.sku)) pivot.set(s.sku, new Map());
    const inner = pivot.get(s.sku)!;
    inner.set(dk, (inner.get(dk) ?? 0) + s.quantity);
  }
  const ws = XLSX.utils.aoa_to_sheet([
    ["SKU", ...dateLabels],
    ...skus.map((sku) => [sku, ...dates.map((d) => pivot.get(sku)?.get(d) ?? 0)]),
  ]);
  ws["!cols"] = [{ wch: 24 }, ...dates.map(() => ({ wch: 10 }))];
  return ws;
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

  const dateSet = new Set<string>();
  const cur = new Date(from);
  while (cur <= to) {
    dateSet.add(dateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  const dates = Array.from(dateSet);
  const dateLabels = dates.map((d) => formatDE(new Date(d)));
  const skus = items.map((i) => i.sku);

  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildPivot(sales, "TAGESVERKAUF", skus, dates, dateLabels, XLSX), "Tagesverkäufe");
  XLSX.utils.book_append_sheet(wb, buildPivot(sales, "HAENDLER", skus, dates, dateLabels, XLSX), "Händler");
  XLSX.utils.book_append_sheet(wb, buildPivot(sales, "LAGER", skus, dates, dateLabels, XLSX), "Neuware-Lager");
  XLSX.utils.book_append_sheet(wb, buildPivot(sales, "NS_LAGER", skus, dates, dateLabels, XLSX), "NS-Lager");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="verkaufe-${von}-${bis}.xlsx"`,
    },
  });
}
