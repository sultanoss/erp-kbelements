import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
  const [items, columns] = await Promise.all([
    prisma.item.findMany({
      select: {
        sku: true,
        name: true,
        purchasePrice: true,
        priceColumnValues: {
          select: { priceColumnId: true, price: true },
        },
      },
      orderBy: { sku: "asc" },
    }),
    prisma.priceColumn.findMany({ orderBy: { order: "asc" } }),
  ]);

  const headers = ["SKU", "Artikelname", ...columns.map((c) => c.title)];

  const rows = items.map((item) => [
    item.sku,
    item.name,
    ...columns.map((col) => {
      const cv = item.priceColumnValues.find((v) => v.priceColumnId === col.id);
      return cv?.price ?? "";
    }),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Column widths
  ws["!cols"] = [
    { wch: 18 },
    { wch: 35 },
    { wch: 18 },
    ...columns.map(() => ({ wch: 18 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Preisliste");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as number[];
  const uint8 = new Uint8Array(buf);

  return new NextResponse(uint8.buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="preisliste.xlsx"',
    },
  });
}
