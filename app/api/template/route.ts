import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const today = new Date().toISOString().slice(0, 10);
  const XLSX = await import("xlsx");

  const headers = ["Artikel", "Otto", "Kaufland", "Media Markt", "Amazon", "Ebay", "Shopify"];

  let rows: string[][];
  let sheetName: string;
  let filename: string;

  let ws: ReturnType<typeof XLSX.utils.aoa_to_sheet>;
  if (type === "herdsets") {
    const herdsetHeaders = ["Artikel", "Menge"];
    const portals = ["Amazon", "Mediamarkt", "Otto", "Kaufland", "Ebay"];
    const herdsetRows: string[][] = [];
    for (const portal of portals) {
      herdsetRows.push([portal, ""]);
      for (let i = 0; i < 5; i++) herdsetRows.push(["", ""]);
    }
    sheetName = "Herdsets";
    filename = `herdsets-${today}.xlsx`;
    ws = XLSX.utils.aoa_to_sheet([herdsetHeaders, ...herdsetRows]);
    // Style portal header rows bold
    const boldStyle = { font: { bold: true }, fill: { fgColor: { rgb: "F0F0F0" }, patternType: "solid" } };
    portals.forEach((_, pi) => {
      const rowIdx = 1 + pi * 6;
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: 0 });
      if (ws[cellRef]) ws[cellRef].s = boldStyle;
    });
    ws["!cols"] = [{ wch: 28 }, { wch: 10 }];
  } else if (type === "receipts") {
    const items = await prisma.item.findMany({ orderBy: { createdAt: "asc" }, select: { sku: true } });
    const receiptHeaders = ["Artikel", "Menge"];
    const rows = items.map((i) => [i.sku, ""]);
    sheetName = "Wareneingang";
    filename = `wareneingang-${today}.xlsx`;
    ws = XLSX.utils.aoa_to_sheet([receiptHeaders, ...rows]);
    ws["!cols"] = [{ wch: 22 }, { wch: 10 }];
  } else if (type === "stock") {
    const items = await prisma.item.findMany({ orderBy: { createdAt: "asc" }, select: { sku: true, stock: true } });
    const stockHeaders = ["Artikel", "Bestand"];
    const rows = items.map((i) => [i.sku, i.stock]);
    sheetName = "Bestand";
    filename = `bestand-${today}.xlsx`;
    ws = XLSX.utils.aoa_to_sheet([stockHeaders, ...rows]);
    ws["!cols"] = [{ wch: 22 }, { wch: 10 }];
  } else {
    const items = await prisma.item.findMany({ orderBy: { createdAt: "asc" }, select: { sku: true } });
    const rows = items.map((i) => [i.sku, "", "", "", "", "", ""]);
    sheetName = "Verkäufe";
    filename = `verkaufe-${today}.xlsx`;
    ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [{ wch: 20 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 10 }];
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws!, sheetName);

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
