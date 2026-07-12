import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const base = "C:/Users/user/Documents/ERP-KBELEMENTS/outputs/merchant-supplemental-audit";
const finalPath = base + "/KB-ELEMENTS-Merchant-Supplemental-Feed-Vorbereitung.xlsx";
const tempPath = base + "/KB-ELEMENTS-Merchant-Supplemental-Feed-Vorbereitung.phase3b.tmp.xlsx";
const previewPath = base + "/preview-phase3b-after.png";
const titles = new Map([
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
  const title = titles.get(sku);
  if (!title) continue;
  const excelRow = i + 1;
  matchedRows.push(excelRow);
  report.push({ sku, title, characters: [...title].length });
  sheet.getRange(`U${excelRow}`).values = [[title]];
}
if (matchedRows.length !== 5) throw new Error(`Erwartet 5 eindeutige Treffer, gefunden: ${matchedRows.length}.`);
if (new Set(report.map((r) => r.title)).size !== 5) throw new Error("Doppelte Shopping-Titel erkannt.");
if (report.some((r) => r.characters > 150)) throw new Error("Mindestens ein Titel überschreitet 150 Zeichen.");

const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(tempPath);
const checkWb = await SpreadsheetFile.importXlsx(await FileBlob.load(tempPath));
const checkSheet = checkWb.worksheets.getItem("Produkte");
const after = checkSheet.getRange("A1:AC71").values;
const allowed = new Set(matchedRows.map((r) => `${r - 1}:20`));
const changed = [];
for (let r = 0; r < before.length; r++) {
  for (let c = 0; c < before[r].length; c++) {
    if (JSON.stringify(canon(before[r][c])) !== JSON.stringify(canon(after[r][c]))) changed.push(`${r}:${c}`);
  }
}
if (changed.length !== 5 || changed.some((key) => !allowed.has(key))) throw new Error(`Nicht erlaubte Zelländerungen: ${changed.join(", ")}`);

for (const row of report) {
  const index = after.slice(1).findIndex((r) => normalize(r[0]) === row.sku);
  if (index < 0 || after[index + 1][20] !== row.title) throw new Error(`Titelprüfung fehlgeschlagen: ${row.sku}`);
}
const otherTitles = after.slice(1).filter((r) => !titles.has(normalize(r[0]))).map((r) => r[20]);
if (otherTitles.some((v) => v !== null && v !== "" && v !== undefined)) throw new Error("Ein anderes Produkt enthält unerwartet einen title-Wert.");
if (!after.slice(1).every((r) => r[28] === "new")) throw new Error("condition wurde verändert oder ist unvollständig.");

const expectedLabels = new Set(titles.keys());
for (const r of after.slice(1)) {
  const sku = normalize(r[0]);
  const label = r[22];
  if (expectedLabels.has(sku) && label !== "spedition_2er") throw new Error(`shipping_label fehlt bei ${sku}.`);
  if (!expectedLabels.has(sku) && label !== null && label !== "" && label !== undefined) throw new Error(`Unerwartetes shipping_label bei ${sku}.`);
}
const idBefore = before.slice(1).map((r) => [r[3], r[5], r[7], r[8]]);
const idAfter = after.slice(1).map((r) => [r[3], r[5], r[7], r[8]]);
if (JSON.stringify(idBefore) !== JSON.stringify(idAfter)) throw new Error("IDs oder Reihenfolge wurden verändert.");

const errors = await checkWb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "formula error scan" });
console.log(errors.ndjson);
const preview = await checkWb.render({ sheetName: "Produkte", range: "A1:W8", scale: 1.15, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
await fs.copyFile(tempPath, finalPath);
await fs.unlink(tempPath);
console.log(JSON.stringify({ products: 70, edited: 5, unchanged: 65, report, uniqueTitles: true, maxLengthCompliant: true, idsAndOrderUnchanged: true, otherFieldsUnchanged: true, supplementalFeedCompatible: true, file: finalPath, preview: previewPath }, null, 2));
