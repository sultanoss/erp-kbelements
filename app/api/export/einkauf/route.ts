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

  const items = await prisma.purchaseOrderItem.findMany({
    where: {
      purchaseOrder: {
        ...(supplier ? { supplier: { equals: supplier } } : {}),
        ...(from || to ? {
          date: {
            ...(from ? { gte: new Date(from + "T00:00:00") } : {}),
            ...(to   ? { lte: new Date(to   + "T23:59:59") } : {}),
          },
        } : {}),
      },
    },
  });

  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.sku, (map.get(item.sku) ?? 0) + item.quantity);
  }

  const rows = [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([sku, qty]) => [sku, qty]);

  const ws = XLSX.utils.aoa_to_sheet([["SKU", "Menge (gesamt)"], ...rows]);
  ws["!cols"] = [{ wch: 22 }, { wch: 16 }];
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
