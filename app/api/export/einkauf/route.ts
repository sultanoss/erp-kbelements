import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";

export async function GET(req: Request) {
  await requireUser();

  const { searchParams } = new URL(req.url);
  const supplier = searchParams.get("supplier") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const hasDateFilter = !!(from || to);

  const items = await prisma.purchaseOrderItem.findMany({
    where: {
      purchaseOrder: {
        ...(supplier ? { supplier: { equals: supplier } } : {}),
        ...(hasDateFilter ? {
          date: {
            ...(from ? { gte: new Date(from + "T00:00:00") } : {}),
            ...(to   ? { lte: new Date(to   + "T23:59:59") } : {}),
          },
        } : {}),
      },
    },
    include: hasDateFilter ? { purchaseOrder: { select: { date: true } } } : undefined,
    orderBy: hasDateFilter ? { purchaseOrder: { date: "asc" } } : { sku: "asc" },
  });

  let rows: (string | number)[][];
  let header: string[];

  if (hasDateFilter) {
    // Group by SKU, aggregate qty, track min/max date
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
    const map = new Map<string, { qty: number; minDate: Date; maxDate: Date }>();
    for (const item of items) {
      const d = (item as typeof item & { purchaseOrder: { date: Date } }).purchaseOrder.date;
      const existing = map.get(item.sku);
      if (existing) {
        existing.qty += item.quantity;
        if (d < existing.minDate) existing.minDate = d;
        if (d > existing.maxDate) existing.maxDate = d;
      } else {
        map.set(item.sku, { qty: item.quantity, minDate: d, maxDate: d });
      }
    }
    rows = [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([sku, { qty, minDate, maxDate }]) => {
        const range = fmt(minDate) === fmt(maxDate) ? fmt(minDate) : `${fmt(minDate)} bis ${fmt(maxDate)}`;
        return [range, sku, qty];
      });
    header = ["Zeitraum", "SKU", "Menge"];
    const ws2 = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws2["!cols"] = [{ wch: 28 }, { wch: 22 }, { wch: 10 }];
    const wb2 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb2, ws2, "Einkauf");
    const buf2 = XLSX.write(wb2, { type: "buffer", bookType: "xlsx" });
    const dateStr2 = new Date().toISOString().slice(0, 10);
    const label2 = supplier ? supplier.replace(/[^a-zA-Z0-9_-]/g, "_") : "alle";
    return new NextResponse(buf2, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="einkauf-${label2}-${dateStr2}.xlsx"`,
      },
    });
  } else {
    // No date filter: aggregate by SKU only
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.sku, (map.get(item.sku) ?? 0) + item.quantity);
    }
    rows = [...map.entries()]
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([sku, qty]) => [sku, qty]);
    header = ["SKU", "Menge"];
  }

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = header.length === 2 ? [{ wch: 22 }, { wch: 10 }] : [{ wch: 14 }, { wch: 22 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Einkauf");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const dateStr = new Date().toISOString().slice(0, 10);
  const label = supplier ? supplier.replace(/[^a-zA-Z0-9_-]/g, "_") : "alle";

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="einkauf-${label}-${dateStr}.xlsx"`,
    },
  });
}
