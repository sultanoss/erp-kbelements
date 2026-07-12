import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const base = "C:/Users/user/Documents/ERP-KBELEMENTS/outputs/merchant-supplemental-audit";
const finalPath = base + "/KB-ELEMENTS-Merchant-Supplemental-Feed-Vorbereitung.xlsx";
const tempPath = base + "/KB-ELEMENTS-Merchant-Supplemental-Feed-Vorbereitung.phase3c.tmp.xlsx";
const previewPath = base + "/preview-phase3c-after.png";
const productTypes = new Map([
  ["ELK75EV1P/ELK60CR1", "Küche > Herdsets > 2-teilig > Glaskeramik"],
  ["ELK75EV1P/ELK60FB1", "Küche > Herdsets > 2-teilig > Induktion"],
  ["ELK75EV1P/ELK60PB1", "Küche > Herdsets > 2-teilig > Plug & Play"],
  ["ELK75EV1P/ELK111AS", "Küche > Herdsets > 2-teilig > Premium Induktion"],
  ["ELK75EV1P/ELK112AS", "Küche > Herdsets > 2-teilig > Premium Plug & Play"],
]);
const expectedTitles = new Map([
  ["ELK75EV1P/ELK60CR1", "KB ELEMENTS Herdset Backofen mit Glaskeramikkochfeld 60 cm 2er Set Energieklasse A+"],
  ["ELK75EV1P/ELK60FB1", "KB ELEMENTS Herdset Backofen mit Induktionskochfeld Flexzone 60 cm 2er Set Energieklasse A+"],
  ["ELK75EV1P/ELK60PB1", "KB ELEMENTS Plug & Play Herdset Backofen und Induktionskochfeld mit Schuko-Stecker Energieklasse A+"],
  ["ELK75EV1P/ELK111AS", "KB ELEMENTS Premium Herdset Backofen mit Induktionskochfeld AntiScratch Flexzone Energieklasse A+"],
  ["ELK75EV1P/ELK112AS", "KB ELEMENTS Premium Plug & Play Herdset AntiScratch Schuko-Stecker Energieklasse A+"],
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
  const value = productTypes.get(sku);
  if (!value) continue;
  if (before[i][20] !== expectedTitles.get(sku)) throw new Error(`Shopping-Titel stimmt vor der Bearbeitung nicht: ${sku}`);
  if (before[i][22] !== "spedition_2er") throw new Error(`shipping_label stimmt vor der Bearbeitung nicht: ${sku}`);
  if (before[i][28] !== "new") throw new Error(`condition stimmt vor der Bearbeitung nicht: ${sku}`);
  const excelRow = i + 1;
  matchedRows.push(excelRow);
  report.push({ sku, product_type_google: value });
  sheet.getRange(`V${excelRow}`).values = [[value]];
}
if (matchedRows.length !== 5) throw new Error(`Erwartet 5 eindeutige Treffer, gefunden: ${matchedRows.length}.`);

const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(tempPath);
const checkWb = await SpreadsheetFile.importXlsx(await FileBlob.load(tempPath));
const checkSheet = checkWb.worksheets.getItem("Produkte");
const after = checkSheet.getRange("A1:AC71").values;
const allowed = new Set(matchedRows.map((r) => `${r - 1}:21`));
const changed = [];
for (let r = 0; r < before.length; r++) {
  for (let c = 0; c < before[r].length; c++) {
    if (JSON.stringify(canon(before[r][c])) !== JSON.stringify(canon(after[r][c]))) changed.push(`${r}:${c}`);
  }
}
if (changed.length !== 5 || changed.some((key) => !allowed.has(key))) throw new Error(`Nicht erlaubte Zelländerungen: ${changed.join(", ")}`);

for (const row of report) {
  const index = after.slice(1).findIndex((r) => normalize(r[0]) === row.sku);
  const current = after[index + 1];
  if (index < 0 || current[21] !== row.product_type_google) throw new Error(`product_type_google-Prüfung fehlgeschlagen: ${row.sku}`);
  if (current[20] !== expectedTitles.get(row.sku)) throw new Error(`title wurde verändert: ${row.sku}`);
  if (current[22] !== "spedition_2er") throw new Error(`shipping_label wurde verändert: ${row.sku}`);
  if (current[28] !== "new") throw new Error(`condition wurde verändert: ${row.sku}`);
}
const otherTypes = after.slice(1).filter((r) => !productTypes.has(normalize(r[0]))).map((r) => r[21]);
if (otherTypes.some((v) => v !== null && v !== "" && v !== undefined)) throw new Error("Ein anderes Produkt enthält unerwartet product_type_google.");
if (!after.slice(1).every((r) => r[28] === "new")) throw new Error("condition ist nicht vollständig unverändert.");

const idBefore = before.slice(1).map((r) => [r[3], r[5], r[7], r[8]]);
const idAfter = after.slice(1).map((r) => [r[3], r[5], r[7], r[8]]);
if (JSON.stringify(idBefore) !== JSON.stringify(idAfter)) throw new Error("IDs oder Reihenfolge wurden verändert.");

const errors = await checkWb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "formula error scan" });
console.log(errors.ndjson);
const preview = await checkWb.render({ sheetName: "Produkte", range: "U1:AC8", scale: 1.3, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
await fs.copyFile(tempPath, finalPath);
await fs.unlink(tempPath);
console.log(JSON.stringify({ products: 70, edited: 5, unchanged: 65, report, titleUnchanged: true, shippingLabelUnchanged: true, conditionUnchanged: true, idsAndOrderUnchanged: true, otherFieldsUnchanged: true, supplementalFeedCompatible: true, file: finalPath, preview: previewPath }, null, 2));
