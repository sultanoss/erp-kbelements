import fs from 'node:fs/promises';
import path from 'node:path';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1'));
const sourcePath = path.join(root, 'herdsets.jsonl');
const outputDir = path.join(root, 'outputs', 'herdsets_export_20260701');
await fs.mkdir(outputDir, { recursive: true });

const lines = (await fs.readFile(sourcePath, 'utf8')).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const products = lines.filter((row) => !row.__parentId);
const children = new Map(products.map((product) => [product.id, []]));
for (const row of lines.filter((item) => item.__parentId)) {
  if (children.has(row.__parentId)) children.get(row.__parentId).push(row);
}

const collectionRows = [];
const metafieldRows = [];
const variantRows = [];
const productRows = [];
const flattenedRows = [];

for (const product of products) {
  const related = children.get(product.id) || [];
  const collections = related.filter((row) => row.handle && !row.namespace && !row.inventoryItem);
  const metafields = related.filter((row) => row.namespace && row.key);
  const variants = related.filter((row) => row.inventoryItem || Object.hasOwn(row, 'sku'));

  productRows.push([
    product.id, `'${product.legacyResourceId}`, product.handle, product.title, product.description, product.descriptionHtml,
    product.vendor, product.productType, product.status, (product.tags || []).join(', '), product.templateSuffix || '',
    new Date(product.createdAt), new Date(product.updatedAt), product.publishedAt ? new Date(product.publishedAt) : null,
    product.onlineStoreUrl || '', product.totalInventory, product.tracksInventory, product.seo?.title || '',
    product.seo?.description || '', product.category?.fullName || product.category?.name || '', JSON.stringify(product.options || []),
    collections.map((row) => row.title).join(' | '), metafields.length, variants.length,
  ]);

  for (const collection of collections) {
    collectionRows.push([product.id, product.handle, product.title, collection.id, collection.handle, collection.title]);
  }
  for (const metafield of metafields) {
    metafieldRows.push([
      product.id, product.handle, product.title, metafield.id, metafield.namespace, metafield.key,
      metafield.type, metafield.value, metafield.description || '',
    ]);
  }
  for (const variant of variants) {
    const weight = variant.inventoryItem?.measurement?.weight;
    variantRows.push([
      product.id, product.handle, product.title, variant.id, `'${variant.legacyResourceId}`, variant.title,
      variant.sku || '', variant.barcode ? `'${variant.barcode}` : '', Number(variant.price), variant.compareAtPrice == null ? null : Number(variant.compareAtPrice),
      variant.availableForSale, variant.inventoryQuantity, variant.taxable, JSON.stringify(variant.selectedOptions || []),
      variant.inventoryItem?.id || '', variant.inventoryItem?.tracked ?? false, weight?.value ?? null, weight?.unit || '',
    ]);

    flattenedRows.push({
      product_id: product.id,
      product_legacy_id: product.legacyResourceId,
      handle: product.handle,
      title: product.title,
      description: product.description,
      description_html: product.descriptionHtml,
      vendor: product.vendor,
      product_type: product.productType,
      status: product.status,
      tags: (product.tags || []).join(', '),
      template_suffix: product.templateSuffix || '',
      created_at: product.createdAt,
      updated_at: product.updatedAt,
      published_at: product.publishedAt || '',
      online_store_url: product.onlineStoreUrl || '',
      total_inventory: product.totalInventory,
      tracks_inventory: product.tracksInventory,
      seo_title: product.seo?.title || '',
      seo_description: product.seo?.description || '',
      category: product.category?.fullName || product.category?.name || '',
      options_json: JSON.stringify(product.options || []),
      collections: collections.map((row) => `${row.title} (${row.handle})`).join(' | '),
      product_metafields_json: JSON.stringify(metafields.map(({ __parentId, ...rest }) => rest)),
      variant_id: variant.id,
      variant_legacy_id: variant.legacyResourceId,
      variant_title: variant.title,
      sku: variant.sku || '',
      barcode: variant.barcode || '',
      price: variant.price,
      compare_at_price: variant.compareAtPrice || '',
      available_for_sale: variant.availableForSale,
      inventory_quantity: variant.inventoryQuantity,
      taxable: variant.taxable,
      selected_options_json: JSON.stringify(variant.selectedOptions || []),
      inventory_item_id: variant.inventoryItem?.id || '',
      inventory_tracked: variant.inventoryItem?.tracked ?? false,
      weight_value: weight?.value ?? '',
      weight_unit: weight?.unit || '',
    });
  }
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
const csvHeaders = Object.keys(flattenedRows[0] || {});
const csv = [csvHeaders.map(csvCell).join(','), ...flattenedRows.map((row) => csvHeaders.map((key) => csvCell(row[key])).join(','))].join('\r\n');
await fs.writeFile(path.join(outputDir, 'herdsets-vollstaendig.csv'), `\uFEFF${csv}`, 'utf8');

const workbook = Workbook.create();
const sheets = [
  {
    name: 'Produkte',
    headers: ['Produkt-ID', 'Legacy-ID', 'Handle', 'Titel', 'Beschreibung', 'Beschreibung HTML', 'Hersteller', 'Produkttyp', 'Status', 'Tags', 'Template', 'Erstellt', 'Aktualisiert', 'Veröffentlicht', 'Shop-URL', 'Bestand gesamt', 'Bestandsführung', 'SEO-Titel', 'SEO-Beschreibung', 'Kategorie', 'Optionen JSON', 'Kollektionen', 'Metafelder Anzahl', 'Varianten Anzahl'],
    rows: productRows,
  },
  {
    name: 'Varianten',
    headers: ['Produkt-ID', 'Handle', 'Produkt', 'Varianten-ID', 'Legacy-ID', 'Variantentitel', 'SKU', 'Barcode', 'Preis', 'Vergleichspreis', 'Verfügbar', 'Bestand', 'Steuerpflichtig', 'Optionen JSON', 'Inventory-Item-ID', 'Bestand verfolgt', 'Gewicht', 'Einheit'],
    rows: variantRows,
  },
  {
    name: 'Metafelder',
    headers: ['Produkt-ID', 'Handle', 'Produkt', 'Metafeld-ID', 'Namespace', 'Schlüssel', 'Typ', 'Wert', 'Beschreibung'],
    rows: metafieldRows,
  },
  {
    name: 'Kollektionen',
    headers: ['Produkt-ID', 'Handle', 'Produkt', 'Kollektion-ID', 'Kollektion-Handle', 'Kollektion'],
    rows: collectionRows,
  },
];

for (const config of sheets) {
  const sheet = workbook.worksheets.add(config.name);
  sheet.showGridLines = false;
  sheet.getRangeByIndexes(0, 0, 1, config.headers.length).values = [config.headers];
  if (config.rows.length) sheet.getRangeByIndexes(1, 0, config.rows.length, config.headers.length).values = config.rows;
  const used = sheet.getRangeByIndexes(0, 0, config.rows.length + 1, config.headers.length);
  used.format.font = { name: 'Aptos', size: 10, color: '#172033' };
  sheet.getRangeByIndexes(0, 0, 1, config.headers.length).format = {
    fill: '#173F35',
    font: { name: 'Aptos', size: 10, bold: true, color: '#FFFFFF' },
    rowHeight: 28,
    wrapText: true,
  };
  sheet.freezePanes.freezeRows(1);
  const table = sheet.tables.add(`A1:${String.fromCharCode(64 + config.headers.length)}${config.rows.length + 1}`, true, `${config.name}Tabelle`);
  table.style = 'TableStyleMedium4';
  used.format.autofitColumns();
  used.format.autofitRows();
  for (let col = 0; col < config.headers.length; col += 1) {
    const column = sheet.getRangeByIndexes(0, col, config.rows.length + 1, 1);
    if (column.format.columnWidth > 45) column.format.columnWidth = 45;
  }
  if (config.name === 'Produkte') {
    sheet.getRange(`A2:B${config.rows.length + 1}`).format.numberFormat = '@';
    sheet.getRange(`L2:N${config.rows.length + 1}`).format.numberFormat = 'yyyy-mm-dd hh:mm';
    sheet.getRange(`E2:F${config.rows.length + 1}`).format.wrapText = true;
    sheet.getRange(`A2:X${config.rows.length + 1}`).format.rowHeight = 42;
  }
  if (config.name === 'Varianten') {
    sheet.getRange(`A2:A${config.rows.length + 1}`).format.numberFormat = '@';
    sheet.getRange(`D2:E${config.rows.length + 1}`).format.numberFormat = '@';
    sheet.getRange(`G2:H${config.rows.length + 1}`).format.numberFormat = '@';
    sheet.getRange(`I2:J${config.rows.length + 1}`).format.numberFormat = '#,##0.00 [$€-de-DE]';
    sheet.getRange(`L2:L${config.rows.length + 1}`).format.numberFormat = '#,##0';
    sheet.getRange(`Q2:Q${config.rows.length + 1}`).format.numberFormat = '#,##0.000';
    sheet.getRange(`A2:R${config.rows.length + 1}`).format.rowHeight = 24;
  }
  if (config.name === 'Metafelder') {
    sheet.getRange(`A2:A${config.rows.length + 1}`).format.numberFormat = '@';
    sheet.getRange(`D2:D${config.rows.length + 1}`).format.numberFormat = '@';
    sheet.getRange(`H2:H${config.rows.length + 1}`).format.wrapText = true;
    sheet.getRange(`A2:I${config.rows.length + 1}`).format.rowHeight = 42;
  }
  if (config.name === 'Kollektionen') {
    sheet.getRange(`A2:A${config.rows.length + 1}`).format.numberFormat = '@';
    sheet.getRange(`D2:D${config.rows.length + 1}`).format.numberFormat = '@';
    sheet.getRange(`A2:F${config.rows.length + 1}`).format.rowHeight = 24;
  }
}

const check = await workbook.inspect({ kind: 'table', range: 'Produkte!A1:X12', include: 'values,formulas', tableMaxRows: 12, tableMaxCols: 24 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A', options: { useRegex: true, maxResults: 100 }, summary: 'Formelfehler' });
console.log(errors.ndjson);

for (const sheetName of ['Produkte', 'Varianten', 'Metafelder', 'Kollektionen']) {
  const preview = await workbook.render({ sheetName, range: 'A1:H12', scale: 1, format: 'png' });
  await fs.writeFile(path.join(outputDir, `preview-${sheetName}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(path.join(outputDir, 'herdsets-vollstaendig.xlsx'));

console.log(JSON.stringify({
  products: productRows.length,
  variants: variantRows.length,
  metafields: metafieldRows.length,
  collections: collectionRows.length,
  csv: path.join(outputDir, 'herdsets-vollstaendig.csv'),
  xlsx: path.join(outputDir, 'herdsets-vollstaendig.xlsx'),
}));
