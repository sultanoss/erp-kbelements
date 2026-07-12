import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = "C:/Users/user/Documents/ERP-KBELEMENTS";
const input = JSON.parse(await fs.readFile(root + "/merchant-supplemental-feed-analysis.json", "utf8"));
const outputDir = root + "/outputs/merchant-supplemental-audit";
await fs.mkdir(outputDir, { recursive: true });

const wb = Workbook.create();
const summary = wb.worksheets.add("Zusammenfassung");
const products = wb.worksheets.add("Produkte");
summary.showGridLines = false;
products.showGridLines = false;

summary.getRange("A1:H1").merge();
summary.getRange("A1").values = [["KB ELEMENTS – Supplemental-Feed Vorbereitung"]];
summary.getRange("A1:H1").format = {
  fill: "#111827",
  font: { bold: true, color: "#FFFFFF", size: 18 },
  verticalAlignment: "center"
};
summary.getRange("A1:H1").format.rowHeight = 34;
summary.getRange("A3:B12").values = [
  ["Kennzahl", "Ergebnis"],
  ["Merchant-Produkte", input.stats.total],
  ["Eindeutige Shopify Product IDs", input.stats.unique_product_ids],
  ["Eindeutige Variant IDs", input.stats.unique_variant_ids],
  ["Doppelte Variant IDs", input.stats.duplicate_variant_ids.length],
  ["Doppelte Merchant Item IDs", input.stats.duplicate_merchant_item_ids.length],
  ["Doppelte Merchant Offer IDs", input.stats.duplicate_offer_ids.length],
  ["Doppelte SKUs", input.stats.duplicate_skus.length],
  ["Fehlende GTIN", input.stats.missing_gtin.length],
  ["Fehlende/0-Versandgewichte", input.stats.missing_weight.length]
];
summary.getRange("A3:B3").format = { fill: "#1F4E78", font: { bold: true, color: "#FFFFFF" } };
summary.getRange("A4:A12").format.font = { bold: true };
summary.getRange("B4:B12").format.numberFormat = "0";
summary.getRange("D3:H3").merge();
summary.getRange("D3").values = [["Empfohlener Schlüssel"]];
summary.getRange("D3:H3").format = { fill: "#1F4E78", font: { bold: true, color: "#FFFFFF" } };
summary.getRange("D4:H5").merge();
summary.getRange("D4").values = [["Merchant Offer ID als Google-id verwenden, z. B. shopify_ZZ_12043298898184_58070011347208"]];
summary.getRange("D4:H5").format = { fill: "#E8F1F8", font: { bold: true, color: "#0F3557" }, wrapText: true, verticalAlignment: "center" };
summary.getRange("D7:H7").merge();
summary.getRange("D7").values = [["Begründung"]];
summary.getRange("D7:H7").format = { fill: "#D9EAD3", font: { bold: true, color: "#274E13" } };
summary.getRange("D8:H12").merge();
summary.getRange("D8").values = [[
  "Der Supplemental Feed muss bestehende Merchant-Angebote über das Google-Attribut id treffen. " +
  "Die Merchant Offer ID entspricht exakt der im Merchant Center sichtbaren Product ID und kombiniert Shopify Product ID und Variant ID. " +
  "SKU ist zwar eindeutig, erfordert aber benutzerdefiniertes Matching; GTIN ist kein geeigneter technischer Primärschlüssel."
]];
summary.getRange("D8:H12").format = { wrapText: true, verticalAlignment: "top" };
summary.getRange("A14:H14").merge();
summary.getRange("A14").values = [["Datenquellen: Shopify Admin API (Google-&-YouTube-Publikation) und Google Merchant Center – Shopify App API. Stand: 2026-07-02. Keine Änderungen durchgeführt."]];
summary.getRange("A14:H14").format = { fill: "#F3F4F6", font: { italic: true, color: "#4B5563" }, wrapText: true };
summary.getRange("A:B").format.columnWidth = 30;
summary.getRange("D:H").format.columnWidth = 18;
summary.getRange("D4:H5").format.rowHeight = 26;
summary.getRange("D8:H12").format.rowHeight = 25;

const headers = [
  "SKU","Produktname","Shopify Produkttitel","Shopify Product ID","Shopify Product GID",
  "Variant ID","Variant GID","Merchant Item ID","Merchant Offer ID","Produkttyp",
  "Google Product Category","Brand","GTIN","Versandgewicht","Gewicht Wert","Gewicht Einheit",
  "Produktstatus","Ziel-Land","Feed-Quelle","Merchant-Präsenz"
];
const dataRows = input.rows.map(r => [
  r.sku,r.produktname,r.shopify_produkttitel,r.shopify_product_id,r.shopify_product_gid,
  r.variant_id,r.variant_gid,r.merchant_item_id,r.merchant_offer_id,r.product_type,
  r.google_product_category,r.brand,r.gtin,r.versandgewicht,r.gewicht_wert,r.gewicht_einheit,
  r.produktstatus,r.ziel_land,r.feed_quelle,r.merchant_praesenz
]);
products.getRangeByIndexes(0,0,1,headers.length).values = [headers];
products.getRangeByIndexes(1,0,dataRows.length,headers.length).values = dataRows;
products.getRangeByIndexes(0,0,1,headers.length).format = {
  fill: "#1F4E78",
  font: { bold: true, color: "#FFFFFF" },
  wrapText: true,
  verticalAlignment: "center"
};
products.getRangeByIndexes(0,0,dataRows.length+1,headers.length).format.borders = {
  insideHorizontal: { style: "thin", color: "#E5E7EB" }
};
products.getRangeByIndexes(1,14,dataRows.length,1).format.numberFormat = "0.00";
products.freezePanes.freezeRows(1);
products.freezePanes.freezeColumns(2);
const table = products.tables.add("A1:T71", true, "MerchantProductsTable");
table.style = "TableStyleMedium2";
table.showFilterButton = true;
products.getRange("A:T").format.autofitColumns();
products.getRange("A:A").format.columnWidth = 24;
products.getRange("B:C").format.columnWidth = 46;
products.getRange("D:I").format.columnWidth = 30;
products.getRange("J:J").format.columnWidth = 24;
products.getRange("K:M").format.columnWidth = 22;
products.getRange("N:N").format.columnWidth = 18;
products.getRange("Q:T").format.columnWidth = 24;
products.getRange("B:C").format.wrapText = true;
products.getRange("A1:T71").format.verticalAlignment = "top";

const inspect = await wb.inspect({
  kind: "table",
  range: "Produkte!A1:T8",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 20,
  maxChars: 6000
});
console.log(inspect.ndjson);
const errors = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan"
});
console.log(errors.ndjson);
const preview = await wb.render({ sheetName: "Zusammenfassung", autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile(outputDir + "/preview.png", new Uint8Array(await preview.arrayBuffer()));
const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(outputDir + "/KB-ELEMENTS-Merchant-Supplemental-Feed-Vorbereitung.xlsx");
