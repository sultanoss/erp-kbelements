import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const today = new Date().toISOString().slice(0, 10);
  const XLSX = await import("xlsx");

  const headers = ["Artikel", "Otto", "Kaufland", "Media Markt", "Amazon", "Ebay"];

  let rows: string[][];
  let sheetName: string;
  let filename: string;

  let ws;
  if (type === "herdsets") {
    const rows = [["75DV2/60PB", "", "", "", "", ""], ["ELK75EV1/60PB1", "", "", "", "", ""]];
    sheetName = "Herdsets";
    filename = `herdsets-${today}.xlsx`;
    ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [{ wch: 20 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 }];
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
    const rows = items.map((i) => [i.sku, "", "", "", "", ""]);
    sheetName = "Verkäufe";
    filename = `verkaufe-${today}.xlsx`;
    ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [{ wch: 20 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 }];
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
