import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
  const [items, columns] = await Promise.all([
    prisma.item.findMany({
      select: {
        sku: true,
        name: true,
        description: true,
        highlights: true,
        scopeOfDelivery: true,
        imageUrl: true,
        priceColumnValues: {
          select: { priceColumnId: true, price: true },
        },
      },
      orderBy: { sku: "asc" },
    }),
    prisma.priceColumn.findMany({ orderBy: { order: "asc" } }),
  ]);

  // Find B2B Price column (case-insensitive match)
  const b2bCol = columns.find((c) => c.title.toLowerCase().includes("b2b"));
  const otherCols = columns.filter((c) => c !== b2bCol);

  const headers = [
    "Image URL",
    "SKU",
    "Product Name",
    "Description",
    "Highlights",
    "Scope of Delivery",
    ...(b2bCol ? ["B2B Price"] : []),
    ...otherCols.map((c) => c.title),
  ];

  const rows = items.map((item) => {
    const getPrice = (colId: string) => {
      const cv = item.priceColumnValues.find((v) => v.priceColumnId === colId);
      return cv?.price ?? "";
    };
    return [
      item.imageUrl ?? "",
      item.sku,
      item.name,
      item.description ?? "",
      item.highlights ?? "",
      item.scopeOfDelivery ?? "",
      ...(b2bCol ? [getPrice(b2bCol.id)] : []),
      ...otherCols.map((col) => getPrice(col.id)),
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws["!cols"] = [
    { wch: 50 }, // Image URL
    { wch: 18 }, // SKU
    { wch: 35 }, // Product Name
    { wch: 40 }, // Description
    { wch: 40 }, // Highlights
    { wch: 40 }, // Scope of Delivery
    ...(b2bCol ? [{ wch: 18 }] : []),
    ...otherCols.map(() => ({ wch: 18 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Price List");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as number[];
  const uint8 = new Uint8Array(buf);

  return new NextResponse(uint8.buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="price-list.xlsx"',
    },
  });
}
