import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const base = "C:/Users/user/Documents/ERP-KBELEMENTS/outputs/merchant-supplemental-audit";
const finalPath = base + "/KB-ELEMENTS-Merchant-Supplemental-Feed-Vorbereitung.xlsx";
const tempPath = base + "/KB-ELEMENTS-Merchant-Supplemental-Feed-Vorbereitung.phase3a.tmp.xlsx";
const previewPath = base + "/preview-phase3a-after.png";
const targetSkus = new Set([
  "ELK75EV1P/ELK60CR1",
  "ELK75EV1P/ELK60FB1",
  "ELK75EV1P/ELK60PB1",
  "ELK75EV1P/ELK111AS",
  "ELK75EV1P/ELK112AS",
]);
const normalize = (v) => String(v ?? "").toUpperCase().replace(/\s+/g, "");
const canon = (v) => v === undefined ? null : v;

const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(finalPath));
const sheet = wb.worksheets.getItem("Produkte");
if (!sheet) throw new Error("Arbeitsblatt 'Produkte' fehlt.");
const before = sheet.getRange("A1:AC71").values;
if (before.length !== 71 || before[0]?.length !== 29) throw new Error("Unerwartete Dateistruktur.");

const matchedRows = [];
for (let i = 1; i < before.length; i++) {
  if (targetSkus.has(normalize(before[i][0]))) matchedRows.push(i + 1);
}
if (matchedRows.length !== 5) throw new Error(`Erwartet 5 eindeutige Treffer, gefunden: ${matchedRows.length}.`);
for (const excelRow of matchedRows) sheet.getRange(`W${excelRow}`).values = [["spedition_2er"]];

const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(tempPath);

const checkWb = await SpreadsheetFile.importXlsx(await FileBlob.load(tempPath));
const checkSheet = checkWb.worksheets.getItem("Produkte");
const after = checkSheet.getRange("A1:AC71").values;
const allowed = new Set(matchedRows.map((r) => `${r - 1}:22`));
const changed = [];
for (let r = 0; r < before.length; r++) {
  for (let c = 0; c < before[r].length; c++) {
    if (JSON.stringify(canon(before[r][c])) !== JSON.stringify(canon(after[r][c]))) changed.push(`${r}:${c}`);
  }
}
if (changed.length !== 5 || changed.some((key) => !allowed.has(key))) {
  throw new Error(`Nicht erlaubte Zelländerungen erkannt: ${changed.join(", ")}`);
}
for (const excelRow of matchedRows) {
  if (after[excelRow - 1][22] !== "spedition_2er") throw new Error(`shipping_label fehlt in Zeile ${excelRow}.`);
}
const otherLabels = after.slice(1).filter((_, i) => !matchedRows.includes(i + 2)).map((r) => r[22]);
if (otherLabels.some((v) => v !== null && v !== "" && v !== undefined)) throw new Error("Ein anderes Produkt enthält unerwartet ein shipping_label.");
if (!after.slice(1).every((r) => r[28] === "new")) throw new Error("condition wurde verändert oder ist unvollständig.");

const idBefore = before.slice(1).map((r) => [r[3], r[5], r[7], r[8]]);
const idAfter = after.slice(1).map((r) => [r[3], r[5], r[7], r[8]]);
if (JSON.stringify(idBefore) !== JSON.stringify(idAfter)) throw new Error("IDs oder Reihenfolge wurden verändert.");

const errors = await checkWb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errors.ndjson);
const preview = await checkWb.render({ sheetName: "Produkte", range: "U1:AC8", scale: 1.4, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

await fs.copyFile(tempPath, finalPath);
await fs.unlink(tempPath);
console.log(JSON.stringify({
  products: 70,
  edited: 5,
  unchanged: 65,
  shippingLabel: "spedition_2er",
  changedCells: changed.length,
  idsAndOrderUnchanged: true,
  otherFieldsUnchanged: true,
  supplementalFeedCompatible: true,
  file: finalPath,
  preview: previewPath,
}, null, 2));
