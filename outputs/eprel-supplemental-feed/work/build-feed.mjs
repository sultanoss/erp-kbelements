import fs from 'node:fs/promises';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const root = 'C:/Users/user/Documents/ERP-KBELEMENTS';
const outputDir = `${root}/outputs/eprel-supplemental-feed`;
const source = JSON.parse(await fs.readFile(`${outputDir}/shopify-eprel-source.json`, 'utf8'));

const rows = source.rows
  .filter((row) => row.product_status === 'ACTIVE' && row.eprel_id && row.variant_id && row.product_id)
  .map((row) => {
    const productId = row.product_id.replace('gid://shopify/Product/', '');
    const variantId = row.variant_id.replace('gid://shopify/ProductVariant/', '');
    return {
      id: `shopify_ZZ_${productId}_${variantId}`,
      certification: `EC:EPREL:${row.eprel_id}`,
      sku: row.sku,
      productTitle: row.product_title,
      productId,
      variantId,
      eprelId: row.eprel_id,
      eprelUrl: row.eprel_url,
      status: row.product_status,
    };
  })
  .sort((a, b) => a.sku.localeCompare(b.sku, 'de'));

const ids = new Set(rows.map((row) => row.id));
const skus = new Set(rows.map((row) => row.sku));
if (ids.size !== rows.length) throw new Error('Doppelte Merchant Offer IDs erkannt');
if (skus.size !== rows.length) throw new Error('Doppelte SKUs erkannt');
if (rows.some((row) => !/^shopify_ZZ_\d+_\d+$/.test(row.id))) throw new Error('Ungültige Merchant Offer ID');
if (rows.some((row) => !/^EC:EPREL:\d+$/.test(row.certification))) throw new Error('Ungültige EPREL-Zertifizierung');

const pilotChecks = [
  ['ELK75EV1P/ELK60CR1', 'EC:EPREL:2776699'],
  ['ELK75DV1/ELK60CR1', 'EC:EPREL:2370688'],
];
for (const [sku, expected] of pilotChecks) {
  const row = rows.find((item) => item.sku === sku);
  if (!row) throw new Error(`Pilotprodukt fehlt: ${sku}`);
  if (row.certification !== expected) throw new Error(`Falsche Zertifizierung für ${sku}`);
}

const certificationHeader = 'certification(certification_authority:certification_name:certification_code)';
const escapeTsv = (value) => String(value).replace(/[\t\r\n]+/g, ' ').trim();
const tsv = [
  `id\t${certificationHeader}`,
  ...rows.map((row) => `${escapeTsv(row.id)}\t${escapeTsv(row.certification)}`),
].join('\r\n') + '\r\n';
await fs.writeFile(`${outputDir}/KB-ELEMENTS-EPREL-Supplemental-Feed.tsv`, `\uFEFF${tsv}`, 'utf8');

const workbook = Workbook.create();
workbook.comments.setSelf({ displayName: 'Hassan Karime' });

const feed = workbook.worksheets.add('Feed');
feed.showGridLines = false;
feed.getRange('A1:B1').values = [['id', certificationHeader]];
feed.getRange(`A2:B${rows.length + 1}`).values = rows.map((row) => [row.id, row.certification]);
feed.getRange('A1:B1').format = {
  fill: '#1C1917',
  font: { bold: true, color: '#FFFFFF' },
  rowHeight: 42,
};
feed.getRange(`A2:B${rows.length + 1}`).format = {
  font: { color: '#1C1917' },
  borders: { insideHorizontal: { style: 'thin', color: '#E7E5E4' } },
};
feed.getRange(`A1:B${rows.length + 1}`).format.wrapText = false;
feed.getRange('B1').format.wrapText = true;
feed.getRange(`A1:A${rows.length + 1}`).format.columnWidth = 50;
feed.getRange(`B1:B${rows.length + 1}`).format.columnWidth = 78;
feed.freezePanes.freezeRows(1);
feed.tables.add(`A1:B${rows.length + 1}`, true, 'EprelFeedTable').style = 'TableStyleMedium2';

const qa = workbook.worksheets.add('QA');
qa.showGridLines = false;
qa.getRange('A1:H1').merge();
qa.getRange('A1').values = [['KB ELEMENTS – EPREL Supplemental Feed QA']];
qa.getRange('A1:H1').format = {
  fill: '#C0182A',
  font: { bold: true, color: '#FFFFFF', size: 16 },
  rowHeight: 34,
};
qa.getRange('A3:B7').values = [
  ['Kennzahl', 'Ergebnis'],
  ['Aufgenommene Merchant-Angebote', rows.length],
  ['Eindeutige Offer IDs', ids.size],
  ['Eindeutige SKUs', skus.size],
  ['Eindeutige EPREL-Nummern', new Set(rows.map((row) => row.eprelId)).size],
];
qa.getRange('A3:B3').format = { fill: '#1C1917', font: { bold: true, color: '#FFFFFF' } };
qa.getRange('A9:H9').values = [['SKU', 'Produkt', 'Merchant Offer ID', 'EPREL-ID', 'Certification', 'EPREL-URL', 'Status', 'QA']];
qa.getRange(`A10:H${rows.length + 9}`).values = rows.map((row) => [
  row.sku,
  row.productTitle,
  row.id,
  row.eprelId,
  row.certification,
  row.eprelUrl,
  row.status,
  'OK',
]);
qa.getRange('A9:H9').format = { fill: '#1C1917', font: { bold: true, color: '#FFFFFF' }, rowHeight: 28 };
qa.getRange(`A10:H${rows.length + 9}`).format = {
  borders: { insideHorizontal: { style: 'thin', color: '#E7E5E4' } },
  verticalAlignment: 'center',
  rowHeight: 34,
  font: { size: 9 },
};
qa.getRange(`H10:H${rows.length + 9}`).format = { fill: '#ECFDF5', font: { bold: true, color: '#047857' } };
qa.getRange('A1:H1').format.wrapText = false;
qa.getRange(`A9:H${rows.length + 9}`).format.wrapText = false;
qa.getRange(`B10:C${rows.length + 9}`).format.wrapText = true;
qa.getRange(`F10:F${rows.length + 9}`).format.wrapText = true;
qa.getRange('A:A').format.columnWidth = 34;
qa.getRange('B:B').format.columnWidth = 50;
qa.getRange('C:C').format.columnWidth = 48;
qa.getRange('D:D').format.columnWidth = 14;
qa.getRange('E:E').format.columnWidth = 24;
qa.getRange('F:F').format.columnWidth = 44;
qa.getRange('G:H').format.columnWidth = 12;
qa.freezePanes.freezeRows(9);
qa.tables.add(`A9:H${rows.length + 9}`, true, 'EprelQaTable').style = 'TableStyleMedium2';
workbook.comments.addThread({ cell: qa.getRange('C10') }, 'Merchant Offer ID folgt dem in der bestehenden Google-&-YouTube-Primärquelle bestätigten Muster shopify_ZZ_<Product-ID>_<Variant-ID>.');

const preview = await workbook.render({ sheetName: 'QA', range: `A1:H${Math.min(rows.length + 9, 25)}`, scale: 1, format: 'png' });
await fs.writeFile(`${outputDir}/KB-ELEMENTS-EPREL-Supplemental-Feed-QA.png`, new Uint8Array(await preview.arrayBuffer()));

const file = await SpreadsheetFile.exportXlsx(workbook);
await file.save(`${outputDir}/KB-ELEMENTS-EPREL-Supplemental-Feed.xlsx`);

const report = {
  generatedAt: new Date().toISOString(),
  sourceProducts: source.product_count,
  includedOffers: rows.length,
  uniqueOfferIds: ids.size,
  uniqueSkus: skus.size,
  uniqueEprelIds: new Set(rows.map((row) => row.eprelId)).size,
  pilotChecks: pilotChecks.map(([sku, expected]) => ({ sku, expected, actual: rows.find((row) => row.sku === sku)?.certification, ok: rows.find((row) => row.sku === sku)?.certification === expected })),
};
await fs.writeFile(`${outputDir}/qa-summary.json`, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report));
