import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const source = await FileBlob.load('C:/Users/user/Documents/ERP-KBELEMENTS/outputs/merchant-supplemental-audit/KB-ELEMENTS-Merchant-Supplemental-Feed-Vorbereitung.xlsx');
const workbook = await SpreadsheetFile.importXlsx(source);
const result = await workbook.inspect({
  kind: 'workbook,sheet,region',
  range: 'A1:Z12',
  include: 'values,formulas',
  maxChars: 12000,
  tableMaxRows: 12,
  tableMaxCols: 26,
});
console.log(result.ndjson);
