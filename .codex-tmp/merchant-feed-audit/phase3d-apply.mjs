import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const base = "C:/Users/user/Documents/ERP-KBELEMENTS/outputs/merchant-supplemental-audit";
const finalPath = base + "/KB-ELEMENTS-Merchant-Supplemental-Feed-Vorbereitung.xlsx";
const tempPath = base + "/KB-ELEMENTS-Merchant-Supplemental-Feed-Vorbereitung.phase3d.tmp.xlsx";
const previewPath = base + "/preview-phase3d-after.png";
const labels = new Map([
  ["ELK75EV1P/ELK60CR1", ["Herdset", "Spedition_2er", "Mittelklasse", "2er_Set", "Standard"]],
  ["ELK75EV1P/ELK60FB1", ["Herdset", "Spedition_2er", "Mittelklasse", "2er_Set", "Flexzone"]],
  ["ELK75EV1P/ELK60PB1", ["Herdset", "Spedition_2er", "Premium", "2er_Set", "Plug_Play"]],
  ["ELK75EV1P/ELK111AS", ["Herdset", "Spedition_2er", "Premium", "2er_Set", "AntiScratch"]],
  ["ELK75EV1P/ELK112AS", ["Herdset", "Spedition_2er", "Premium", "2er_Set", "Plug_Play"]],
]);
const normalize = (v) => String(v ?? "").toUpperCase().replace(/\s+/g, "");
const canon = (v) => v === undefined ? null : v;

const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(finalPath));
const sheet = wb.worksheets.getItem("Produkte");
if (!sheet) throw new Error("Arbeitsblatt 'Produkte' fehlt.");
const before = sheet.getRange("A1:AC71").values;
if (before.length !== 71 || before[0]?.length !== 29) throw new Error("Unerwartete Dateistruktur.");

const matchedRows = [];
const report = [];
for (let i = 1; i < before.length; i++) {
  const sku = normalize(before[i][0]);
  const values = labels.get(sku);
  if (!values) continue;
  if (!before[i][20]) throw new Error(`title fehlt vor Phase 3D: ${sku}`);
  if (!before[i][21]) throw new Error(`product_type_google fehlt vor Phase 3D: ${sku}`);
  if (before[i][22] !== "spedition_2er") throw new Error(`shipping_label stimmt vor Phase 3D nicht: ${sku}`);
  if (before[i][28] !== "new") throw new Error(`condition stimmt vor Phase 3D nicht: ${sku}`);
  const excelRow = i + 1;
  matchedRows.push(excelRow);
  report.push({ sku, custom_label_0: values[0], custom_label_1: values[1], custom_label_2: values[2], custom_label_3: values[3], custom_label_4: values[4] });
  sheet.getRange(`X${excelRow}:AB${excelRow}`).values = [values];
}
if (matchedRows.length !== 5) throw new Error(`Erwartet 5 eindeutige Treffer, gefunden: ${matchedRows.length}.`);

const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(tempPath);
const checkWb = await SpreadsheetFile.importXlsx(await FileBlob.load(tempPath));
const checkSheet = checkWb.worksheets.getItem("Produkte");
const after = checkSheet.getRange("A1:AC71").values;
const allowed = new Set(matchedRows.flatMap((r) => [23,24,25,26,27].map((c) => `${r - 1}:${c}`)));
const changed = [];
for (let r = 0; r < before.length; r++) {
  for (let c = 0; c < before[r].length; c++) {
    if (JSON.stringify(canon(before[r][c])) !== JSON.stringify(canon(after[r][c]))) changed.push(`${r}:${c}`);
  }
}
if (changed.length !== 25 || changed.some((key) => !allowed.has(key))) throw new Error(`Nicht erlaubte Zelländerungen: ${changed.join(", ")}`);

for (const row of report) {
  const index = after.slice(1).findIndex((r) => normalize(r[0]) === row.sku);
  if (index < 0) throw new Error(`Produkt fehlt nach Export: ${row.sku}`);
  const current = after[index + 1];
  const expected = labels.get(row.sku);
  if (JSON.stringify(current.slice(23, 28)) !== JSON.stringify(expected)) throw new Error(`Custom-Label-Prüfung fehlgeschlagen: ${row.sku}`);
  if (current[20] !== before[index + 1][20]) throw new Error(`title wurde verändert: ${row.sku}`);
  if (current[21] !== before[index + 1][21]) throw new Error(`product_type_google wurde verändert: ${row.sku}`);
  if (current[22] !== "spedition_2er") throw new Error(`shipping_label wurde verändert: ${row.sku}`);
  if (current[28] !== "new") throw new Error(`condition wurde verändert: ${row.sku}`);
}
const otherLabels = after.slice(1).filter((r) => !labels.has(normalize(r[0]))).flatMap((r) => r.slice(23, 28));
if (otherLabels.some((v) => v !== null && v !== "" && v !== undefined)) throw new Error("Ein anderes Produkt enthält unerwartete Custom Labels.");
const idBefore = before.slice(1).map((r) => [r[3], r[5], r[7], r[8]]);
const idAfter = after.slice(1).map((r) => [r[3], r[5], r[7], r[8]]);
if (JSON.stringify(idBefore) !== JSON.stringify(idAfter)) throw new Error("IDs oder Reihenfolge wurden verändert.");

const errors = await checkWb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "formula error scan" });
console.log(errors.ndjson);
const preview = await checkWb.render({ sheetName: "Produkte", range: "U1:AC8", scale: 1.3, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
await fs.copyFile(tempPath, finalPath);
await fs.unlink(tempPath);
console.log(JSON.stringify({ products: 70, edited: 5, unchanged: 65, changedCells: 25, report, titleUnchanged: true, productTypeGoogleUnchanged: true, shippingLabelUnchanged: true, conditionUnchanged: true, idsAndOrderUnchanged: true, otherFieldsUnchanged: true, supplementalFeedCompatible: true, file: finalPath, preview: previewPath }, null, 2));
