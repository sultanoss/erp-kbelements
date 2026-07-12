import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const root = 'C:/Users/user/Documents/ERP-KBELEMENTS/outputs/eprel-supplemental-feed';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(`${root}/KB-ELEMENTS-EPREL-Supplemental-Feed.xlsx`));
const table = await workbook.inspect({
  kind: 'table',
  range: 'Feed!A1:B86',
  include: 'values,formulas',
  tableMaxRows: 90,
  tableMaxCols: 2,
  maxChars: 18000,
});
const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 100 },
  summary: 'final formula error scan',
});
const tsv = (await fs.readFile(`${root}/KB-ELEMENTS-EPREL-Supplemental-Feed.tsv`, 'utf8')).replace(/^\uFEFF/, '');
const lines = tsv.trimEnd().split(/\r?\n/);
const header = lines[0];
const data = lines.slice(1).map((line) => line.split('\t'));
const ids = data.map((row) => row[0]);
const certs = data.map((row) => row[1]);
const result = {
  workbookCheck: table.ndjson.includes('shopify_ZZ_') && table.ndjson.includes('EC:EPREL:'),
  formulaErrors: errors.ndjson,
  tsvRows: data.length,
  tsvColumns: header.split('\t').length,
  header,
  uniqueIds: new Set(ids).size,
  validIds: ids.every((id) => /^shopify_ZZ_\d+_\d+$/.test(id)),
  validCertifications: certs.every((value) => /^EC:EPREL:\d+$/.test(value)),
  emptyCells: data.some((row) => row.length !== 2 || !row[0] || !row[1]),
};
console.log(JSON.stringify(result));
