import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:/Users/user/Documents/ERP-KBELEMENTS";
const outputDir = root + "/outputs/merchant-supplemental-audit";
const finalPath = outputDir + "/KB-ELEMENTS-Merchant-Supplemental-Feed-Vorbereitung.xlsx";
const tempPath = outputDir + "/KB-ELEMENTS-Merchant-Supplemental-Feed-Vorbereitung.phase2.tmp.xlsx";
const previewPath = outputDir + "/preview-phase2.png";

const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(finalPath));
const products = wb.worksheets.getItem("Produkte");
if (!products) throw new Error("Arbeitsblatt 'Produkte' fehlt.");

const original = products.getRange("A1:T71").values;
if (!Array.isArray(original) || original.length !== 71 || original[0]?.length !== 20) {
  throw new Error(`Unerwartete Ausgangsgröße: ${original?.length ?? 0} Zeilen.`);
}
const originalJson = JSON.stringify(original);
const originalIds = original.slice(1).map((r) => [r[3], r[5], r[8]]);

const addedHeaders = [
  "title",
  "product_type_google",
  "shipping_label",
  "custom_label_0",
  "custom_label_1",
  "custom_label_2",
  "custom_label_3",
  "custom_label_4",
  "condition",
];

products.getRange("U1:AC1").values = [addedHeaders];
products.getRange("U2:AB71").values = Array.from({ length: 70 }, () => Array(8).fill(""));
products.getRange("AC2:AC71").values = Array.from({ length: 70 }, () => ["new"]);
products.getRange("U1:AC1").format = {
  fill: "#1F4E78",
  font: { bold: true, color: "#FFFFFF" },
  wrapText: true,
  verticalAlignment: "center",
};
products.getRange("U1:AC71").format.borders = {
  insideHorizontal: { style: "thin", color: "#E5E7EB" },
};
products.getRange("U:AC").format.columnWidth = 22;
products.getRange("U1:AC71").format.verticalAlignment = "top";

if (JSON.stringify(products.getRange("A1:T71").values) !== originalJson) {
  throw new Error("Bestehende Werte wurden während der Bearbeitung verändert.");
}

const blob = await SpreadsheetFile.exportXlsx(wb);
await blob.save(tempPath);

const checkWb = await SpreadsheetFile.importXlsx(await FileBlob.load(tempPath));
const check = checkWb.worksheets.getItem("Produkte");
const checkedOriginal = check.getRange("A1:T71").values;
const checkedHeaders = check.getRange("U1:AC1").values?.[0] ?? [];
const checkedBlanks = check.getRange("U2:AB71").values;
const checkedCondition = check.getRange("AC2:AC71").values;
const checkedIds = checkedOriginal.slice(1).map((r) => [r[3], r[5], r[8]]);

if (JSON.stringify(checkedOriginal) !== originalJson) throw new Error("Exportprüfung: bestehende Daten weichen ab.");
if (JSON.stringify(checkedIds) !== JSON.stringify(originalIds)) throw new Error("Exportprüfung: ID-Reihenfolge weicht ab.");
if (JSON.stringify(checkedHeaders) !== JSON.stringify(addedHeaders)) throw new Error("Exportprüfung: neue Spalten fehlen oder sind falsch sortiert.");
if (!checkedBlanks.every((row) => row.every((v) => v === "" || v === null || v === undefined))) throw new Error("Exportprüfung: vorgesehene leere Spalten enthalten Werte.");
if (!checkedCondition.every((row) => row[0] === "new")) throw new Error("Exportprüfung: condition ist nicht überall 'new'.");

const errors = await checkWb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
if (errors.ndjson && !errors.ndjson.includes('"matches":[]') && !errors.ndjson.includes('"count":0')) {
  console.log(errors.ndjson);
}

const preview = await checkWb.render({ sheetName: "Produkte", range: "U1:AC8", scale: 1.4, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

await fs.copyFile(tempPath, finalPath);
await fs.unlink(tempPath);
console.log(JSON.stringify({
  file: finalPath,
  products: 70,
  existingColumnsPreserved: 20,
  addedColumns: addedHeaders,
  conditionRows: checkedCondition.length,
  idOrderUnchanged: true,
  existingValuesUnchanged: true,
  preview: previewPath,
}, null, 2));
