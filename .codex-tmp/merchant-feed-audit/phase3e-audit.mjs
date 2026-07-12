import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:/Users/user/Documents/ERP-KBELEMENTS";
const file = root + "/outputs/merchant-supplemental-audit/KB-ELEMENTS-Merchant-Supplemental-Feed-Vorbereitung.xlsx";
const baseline = JSON.parse(await fs.readFile(root + "/merchant-supplemental-feed-analysis.json", "utf8"));
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(file));
const sheet = wb.worksheets.getItem("Produkte");
if (!sheet) throw new Error("Arbeitsblatt Produkte fehlt.");
const data = sheet.getRange("A1:AC71").values;
const headers = data[0].map((v) => String(v ?? ""));
const rows = data.slice(1);
const expectedHeaders = ["SKU","Produktname","Shopify Produkttitel","Shopify Product ID","Shopify Product GID","Variant ID","Variant GID","Merchant Item ID","Merchant Offer ID","Produkttyp","Google Product Category","Brand","GTIN","Versandgewicht","Gewicht Wert","Gewicht Einheit","Produktstatus","Ziel-Land","Feed-Quelle","Merchant-Präsenz","title","product_type_google","shipping_label","custom_label_0","custom_label_1","custom_label_2","custom_label_3","custom_label_4","condition"];
const target = new Set(["ELK75EV1P/ELK60CR1","ELK75EV1P/ELK60FB1","ELK75EV1P/ELK60PB1","ELK75EV1P/ELK111AS","ELK75EV1P/ELK112AS"]);
const normalize = (v) => String(v ?? "").toUpperCase().replace(/\s+/g, "");
const nonBlank = (v) => v !== null && v !== undefined && String(v) !== "";
const duplicates = (values) => {
  const seen = new Set(), dup = new Set();
  for (const value of values) { const key = String(value ?? ""); if (seen.has(key)) dup.add(key); else seen.add(key); }
  return [...dup];
};

const baselineRows = baseline.rows;
const orderOk = baselineRows.length === rows.length && rows.every((r, i) => String(r[8] ?? "") === String(baselineRows[i].merchant_offer_id ?? ""));
const originalDataOk = rows.every((r, i) => {
  const b = baselineRows[i];
  const expected = [b.sku,b.produktname,b.shopify_produkttitel,b.shopify_product_id,b.shopify_product_gid,b.variant_id,b.variant_gid,b.merchant_item_id,b.merchant_offer_id,b.product_type,b.google_product_category,b.brand,b.gtin,b.versandgewicht,b.gewicht_wert,b.gewicht_einheit,b.produktstatus,b.ziel_land,b.feed_quelle,b.merchant_praesenz];
  return JSON.stringify(r.slice(0,20).map((v) => v ?? null)) === JSON.stringify(expected.map((v) => v ?? null));
});

const ids = rows.map((r) => r[8]);
const merchantItems = rows.map((r) => r[7]);
const gtins = rows.map((r) => r[12]);
const titleRows = rows.filter((r) => nonBlank(r[20]));
const pilotRows = rows.filter((r) => target.has(normalize(r[0])));
const nonPilotRows = rows.filter((r) => !target.has(normalize(r[0])));
const invalidControls = [];
const tabsOrBreaks = [];
for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
  const value = String(rows[r][c] ?? "");
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) invalidControls.push({ row: r + 2, column: c + 1 });
  if (/[\t\r\n]/.test(value)) tabsOrBreaks.push({ row: r + 2, column: c + 1 });
}
const gtinFormatIssues = rows.filter((r) => nonBlank(r[12]) && !/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(String(r[12]))).map((r) => ({ sku:r[0], gtin:r[12] }));
const merchantOfferFormatIssues = rows.filter((r) => nonBlank(r[8]) && !/^shopify_[A-Z]{2}_\d+_\d+$/.test(String(r[8]))).map((r) => ({ sku:r[0], id:r[8] }));

const result = {
  workbook: { rows: rows.length, columns: headers.length, headersExact: JSON.stringify(headers) === JSON.stringify(expectedHeaders), headers },
  matchingKey: {
    directGoogleIdHeaderPresent: headers.includes("id"),
    recommendedSourceColumn: "Merchant Offer ID",
    merchantOfferIdsUnique: duplicates(ids).length === 0,
    merchantOfferIdsEmpty: ids.filter((v) => !nonBlank(v)).length,
    merchantOfferIdDuplicates: duplicates(ids),
    merchantOfferIdFormatIssues: merchantOfferFormatIssues,
  },
  sourceIntegrity: {
    original20ColumnsUnchanged: originalDataOk,
    rowOrderUnchanged: orderOk,
    merchantItemIdsUnique: duplicates(merchantItems).length === 0,
    merchantItemIdsEmpty: merchantItems.filter((v) => !nonBlank(v)).length,
    gtinDuplicates: duplicates(gtins),
    gtinEmpty: gtins.filter((v) => !nonBlank(v)).length,
    gtinFormatIssues,
  },
  pilot: {
    pilotRows: pilotRows.length,
    conditionAllNew: rows.every((r) => r[28] === "new"),
    shippingLabelsCorrect: pilotRows.every((r) => r[22] === "spedition_2er") && nonPilotRows.every((r) => !nonBlank(r[22])),
    titlesPresentOnlyForPilot: titleRows.length === 5 && pilotRows.every((r) => nonBlank(r[20])) && nonPilotRows.every((r) => !nonBlank(r[20])),
    titlesUnique: duplicates(titleRows.map((r) => r[20])).length === 0,
    titleLengths: pilotRows.map((r) => ({ sku:r[0], characters:[...String(r[20])].length })),
    productTypesCorrectScope: pilotRows.every((r) => nonBlank(r[21])) && nonPilotRows.every((r) => !nonBlank(r[21])),
    customLabelsCorrectScope: pilotRows.every((r) => r.slice(23,28).every(nonBlank)) && nonPilotRows.every((r) => r.slice(23,28).every((v) => !nonBlank(v))),
    pilotValues: pilotRows.map((r) => ({ sku:r[0], title:r[20], product_type_google:r[21], shipping_label:r[22], custom_labels:r.slice(23,28), condition:r[28] })),
  },
  encoding: { unicodeCapableContainer: true, invalidControlCharacters: invalidControls, tabsOrLineBreaks: tabsOrBreaks },
  directFeedCompatibility: {
    xlsxAcceptedAsDirectProductFile: false,
    googleAttributeHeadersReady: false,
    blockingHeaderMappings: ["Merchant Offer ID -> id", "product_type_google -> product_type"],
    extraMasterColumnsMustBeExcludedFromUploadView: headers.slice(0,20).filter((h) => h !== "Merchant Offer ID"),
    readyAfterExportMapping: true,
  },
};
console.log(JSON.stringify(result, null, 2));
