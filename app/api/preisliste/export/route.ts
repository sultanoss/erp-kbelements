import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

const HEADER_BG = "FF3A4D63";
const HEADER_FG = "FFF0F4F8";
const ACCENT    = "FF5B8BB5";
const ROW_ODD   = "FFFFFFFF";
const ROW_EVEN  = "FFF2F5F9";
const BORDER_C  = "FFDDE3EA";
const TEXT_DARK = "FF1E2A36";
const TEXT_MID  = "FF5A6B7C";

function thinBorder(color: string): ExcelJS.Border {
  return { style: "thin", color: { argb: color } };
}

const allBorders: Partial<ExcelJS.Borders> = {
  top:    thinBorder(BORDER_C),
  bottom: thinBorder(BORDER_C),
  left:   thinBorder(BORDER_C),
  right:  thinBorder(BORDER_C),
};

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
        image: { select: { data: true, contentType: true } },
        priceColumnValues: { select: { priceColumnId: true, price: true } },
      },
      orderBy: { sku: "asc" },
    }),
    prisma.priceColumn.findMany({ orderBy: { order: "asc" } }),
  ]);

  const b2bCol   = columns.find((c) => c.title.toLowerCase().includes("b2b"));
  const otherCols = columns.filter((c) => c !== b2bCol);

  const wb = new ExcelJS.Workbook();
  wb.creator = "KB Elements ERP";
  const ws = wb.addWorksheet("Price List");

  // Freeze header row
  ws.views = [{ state: "frozen", ySplit: 1 }];

  // Define columns
  ws.columns = [
    { key: "image",          width: 10 },
    { key: "sku",            width: 16 },
    { key: "name",           width: 38 },
    { key: "description",    width: 40 },
    { key: "highlights",     width: 40 },
    { key: "scopeOfDelivery",width: 40 },
    ...(b2bCol ? [{ key: "b2b", width: 16 }] : []),
    ...otherCols.map(() => ({ width: 16 })),
  ];

  // Header row
  const headerValues = [
    "Image",
    "SKU",
    "Product Name",
    "Description",
    "Highlights",
    "Scope of Delivery",
    ...(b2bCol ? ["B2B Price"] : []),
    ...otherCols.map((c) => c.title),
  ];

  const headerRow = ws.addRow(headerValues);
  headerRow.height = 30;
  headerRow.eachCell((cell, colNum) => {
    cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.font   = { name: "Calibri", size: 10, bold: true, color: { argb: HEADER_FG } };
    cell.border = { ...allBorders, bottom: { style: "medium", color: { argb: ACCENT } } };
    cell.alignment = { vertical: "middle", horizontal: colNum === 7 ? "right" : "left" };
  });

  // Data rows
  for (let i = 0; i < items.length; i++) {
    const item    = items[i];
    const rowIdx  = i + 2; // 1-based, row 1 is header
    const isEven  = i % 2 === 1;
    const bgArgb  = isEven ? ROW_EVEN : ROW_ODD;

    const getPrice = (colId: string) => {
      const cv = item.priceColumnValues.find((v) => v.priceColumnId === colId);
      return cv?.price ?? null;
    };

    const rowData = [
      "",                          // image placeholder (col 1)
      item.sku,
      item.name,
      item.description  ?? "",
      item.highlights   ?? "",
      item.scopeOfDelivery ?? "",
      ...(b2bCol ? [getPrice(b2bCol.id)] : []),
      ...otherCols.map((col) => getPrice(col.id)),
    ];

    const row = ws.addRow(rowData);
    row.height = 58;

    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
      cell.border = allBorders;
      cell.alignment = { vertical: "middle", wrapText: colNum >= 4 && colNum <= 6 };

      if (colNum === 2) {
        // SKU — bold
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: TEXT_DARK } };
      } else if (colNum >= 4 && colNum <= 6) {
        // Description / Highlights / Scope
        cell.font = { name: "Calibri", size: 10, color: { argb: TEXT_MID } };
      } else if (colNum >= 7) {
        // Price columns — right-aligned, number format
        cell.font      = { name: "Calibri", size: 11, color: { argb: TEXT_DARK } };
        cell.alignment = { vertical: "middle", horizontal: "right" };
        if (typeof cell.value === "number") {
          cell.numFmt = '#,##0.00 "€"';
        }
      } else {
        cell.font = { name: "Calibri", size: 11, color: { argb: TEXT_DARK } };
      }
    });

    // Embed image if available
    if (item.image?.data) {
      const ext = item.image.contentType.includes("png") ? "png" : "jpeg";
      const imgId = wb.addImage({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buffer: Buffer.from(item.image.data as any) as any,
        extension: ext,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ws.addImage(imgId, { tl: { col: 0, row: rowIdx - 1 } as any, br: { col: 1, row: rowIdx } as any, editAs: "oneCell" });
    }
  }

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="price-list.xlsx"',
    },
  });
}
