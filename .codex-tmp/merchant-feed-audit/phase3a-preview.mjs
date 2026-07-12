import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const file = "C:/Users/user/Documents/ERP-KBELEMENTS/outputs/merchant-supplemental-audit/KB-ELEMENTS-Merchant-Supplemental-Feed-Vorbereitung.xlsx";
const preview = "C:/Users/user/Documents/ERP-KBELEMENTS/outputs/merchant-supplemental-audit/preview-phase3a-before.png";
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(file));
const sheet = wb.worksheets.getItem("Produkte");
const data = sheet.getRange("A1:AC71").values;
const targets = ["ELK75EV1P/ELK60CR1","ELK75EV1P/ELK60FB1","ELK75EV1P/ELK60PB1","ELK75EV1P/ELK111AS","ELK75EV1P/ELK112AS"];
const normalize = (v) => String(v ?? "").toUpperCase().replace(/\s+/g, "");
const matches = data.slice(1).map((r, i) => ({ row: i + 2, sku: r[0], shipping_label: r[22] })).filter((r) => targets.includes(normalize(r.sku)));
const blob = await wb.render({ sheetName: "Produkte", range: "U1:AC8", scale: 1.4, format: "png" });
await fs.writeFile(preview, new Uint8Array(await blob.arrayBuffer()));
console.log(JSON.stringify({ rows: data.length - 1, columns: data[0].length, matches, preview }, null, 2));
