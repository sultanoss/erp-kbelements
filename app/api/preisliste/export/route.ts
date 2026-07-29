import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
  const [items, columns] = await Promise.all([
    prisma.item.findMany({
      select: {
        sku: true,
        name: true,
        priceColumnValues: {
          select: { priceColumnId: true, price: true },
        },
      },
      orderBy: { sku: "asc" },
    }),
    prisma.priceColumn.findMany({ orderBy: { order: "asc" } }),
  ]);

  const headers = ["SKU", "Produktname", ...columns.map((c) => c.title)];

  const rows = items.map((item) => {
    const getPrice = (colId: string) => {
      const cv = item.priceColumnValues.find((v) => v.priceColumnId === colId);
      return cv?.price ?? "";
    };
    return [item.sku, item.name, ...columns.map((col) => getPrice(col.id))];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws["!cols"] = [
    { wch: 18 },
    { wch: 40 },
    ...columns.map(() => ({ wch: 18 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Preisliste");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as number[];

  return new NextResponse(new Uint8Array(buf).buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="preisliste.xlsx"',
    },
  });
}
