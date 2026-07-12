import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = "C:/Users/user/Documents/ERP-KBELEMENTS";
const data = JSON.parse(await fs.readFile(root + "/.codex-tmp/merchant-feed-audit/missing-merchant-skus.json", "utf8"));
const outputDir = root + "/outputs/merchant-supplemental-audit";
const outputPath = outputDir + "/KB-ELEMENTS-SKUs-nicht-im-Merchant-Center.xlsx";

const wb = Workbook.create();
const summary = wb.worksheets.add("Übersicht");
const list = wb.worksheets.add("Fehlende SKUs");
summary.showGridLines = false;
list.showGridLines = false;

summary.getRange("A1:D1").merge();
summary.getRange("A1").values = [["KB ELEMENTS – Shopify-SKUs ohne Merchant-Center-Eintrag"]];
summary.getRange("A1:D1").format = { fill: "#111827", font: { bold: true, color: "#FFFFFF", size: 17 }, verticalAlignment: "center" };
summary.getRange("A1:D1").format.rowHeight = 34;
summary.getRange("A3:B6").values = [
  ["Kennzahl", "Anzahl"],
  ["Shopify-SKUs insgesamt", 111],
  ["Merchant-Center-SKUs", 70],
  ["Fehlende SKUs", data.length],
];
summary.getRange("A3:B3").format = { fill: "#1F4E78", font: { bold: true, color: "#FFFFFF" } };
summary.getRange("A4:A6").format.font = { bold: true };
summary.getRange("B4:B6").format.numberFormat = "0";
summary.getRange("A8:D9").merge();
summary.getRange("A8").values = [["Hinweis: 40 fehlende Produkte sind aktiv. ELK60PR2 ist in Shopify als Entwurf gespeichert."]];
summary.getRange("A8:D9").format = { fill: "#FFF4E5", font: { color: "#7C4A03", bold: true }, wrapText: true, verticalAlignment: "center" };
summary.getRange("A11:D11").merge();
summary.getRange("A11").values = [["Stand: 02.07.2026 · Nur lesender Abgleich · Keine Änderungen an Shopify oder Merchant Center"]];
summary.getRange("A11:D11").format = { fill: "#F3F4F6", font: { italic: true, color: "#4B5563" } };
summary.getRange("A:A").format.columnWidth = 34;
summary.getRange("B:B").format.columnWidth = 18;
summary.getRange("C:D").format.columnWidth = 22;

const headers = ["SKU", "Shopify-Produkttitel", "Shopify-Status", "Merchant-Center-Status"];
const rows = data.map((r) => [r.sku, r.title, r.status === "ACTIVE" ? "Aktiv" : "Entwurf", "Nicht vorhanden"]);
list.getRangeByIndexes(0, 0, 1, headers.length).values = [headers];
list.getRangeByIndexes(1, 0, rows.length, headers.length).values = rows;
list.getRange("A1:D42").format.verticalAlignment = "top";
list.getRange("A1:D1").format = { fill: "#1F4E78", font: { bold: true, color: "#FFFFFF" }, wrapText: true };
list.getRange("A1:D42").format.borders = { insideHorizontal: { style: "thin", color: "#E5E7EB" } };
list.getRange("A:A").format.columnWidth = 30;
list.getRange("B:B").format.columnWidth = 68;
list.getRange("C:D").format.columnWidth = 24;
list.getRange("B2:B42").format.wrapText = true;
list.freezePanes.freezeRows(1);
const table = list.tables.add("A1:D42", true, "MissingMerchantSkusTable");
table.style = "TableStyleMedium2";
table.showFilterButton = true;

const check = await wb.inspect({ kind: "table", range: "Fehlende SKUs!A1:D42", include: "values,formulas", tableMaxRows: 45, tableMaxCols: 4, maxChars: 12000 });
console.log(check.ndjson);
const errors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "formula error scan" });
console.log(errors.ndjson);

await fs.mkdir(outputDir, { recursive: true });
const p1 = await wb.render({ sheetName: "Übersicht", autoCrop: "all", scale: 1.5, format: "png" });
await fs.writeFile(outputDir + "/preview-missing-skus-summary.png", new Uint8Array(await p1.arrayBuffer()));
const p2 = await wb.render({ sheetName: "Fehlende SKUs", range: "A1:D15", scale: 1.3, format: "png" });
await fs.writeFile(outputDir + "/preview-missing-skus-list.png", new Uint8Array(await p2.arrayBuffer()));
const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(outputPath);
console.log(JSON.stringify({ outputPath, rows: data.length, active: data.filter(r => r.status === "ACTIVE").length, draft: data.filter(r => r.status !== "ACTIVE").length }, null, 2));
