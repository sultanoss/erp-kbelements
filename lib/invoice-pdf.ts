import { PDFDocument, StandardFonts, rgb, degrees, AFRelationship, PDFName } from "pdf-lib";
import { generateZugferdXml, generateZugferdXmp } from "./invoice-zugferd";
import type { Invoice, InvoiceItem, InvoiceItemSku } from "@prisma/client";

export type InvWithItems = Invoice & {
  items: (InvoiceItem & { skus: InvoiceItemSku[] })[];
};

// A4 page geometry (pt)
const W = 595, H = 842;
const ML = 70, MR = 57; // margins left=25mm, right=20mm
const MT = 57;           // top margin 20mm
const CW = W - ML - MR; // 468pt

// Table column right-edges (from left)
const T = {
  pos: ML,           // left edge pos column
  qty: ML + 24,      // left edge qty
  sku: ML + 64,      // left edge sku
  desc: ML + 136,    // left edge description
  mwstR: ML + 341,   // right edge MwSt col (desc+155+50)
  epR: ML + 409,     // right edge E.-Preis col (+68)
  gpR: ML + CW,      // right edge G.-Preis = TABLE_RIGHT = 538
};

function de(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function deDate(d: Date | string) {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function truncate(text: string, maxWidth: number, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && font.widthOfTextAtSize(t + "…", size) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

export async function generateInvoicePdf(inv: InvWithItems): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const R = await doc.embedFont(StandardFonts.Helvetica);
  const B = await doc.embedFont(StandardFonts.HelveticaBold);

  const BLACK = rgb(0, 0, 0);
  const GREY = rgb(0.5, 0.5, 0.5);
  const DGREY = rgb(0.25, 0.25, 0.25);
  const LGREY = rgb(0.94, 0.94, 0.94);
  const RED = rgb(0.753, 0.094, 0.165);

  const shipping = inv.shippingCost ?? 0;
  const shippingMwst = inv.shippingMwst ?? 19;
  const bruttoPos = inv.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const bruttoGesamt = bruttoPos + shipping;
  const isStorniert = inv.status === "storniert";

  const sameMwst = shippingMwst === inv.mwstRate || shipping === 0;
  const productNetto = inv.mwstRate > 0 ? bruttoPos / (1 + inv.mwstRate / 100) : bruttoPos;
  const productMwstAmt = bruttoPos - productNetto;
  const shippingNetto = shippingMwst > 0 && shipping > 0 ? shipping / (1 + shippingMwst / 100) : shipping;
  const shippingMwstAmt = shipping - shippingNetto;
  const totalNetto = productNetto + shippingNetto;
  const totalMwstAmt = productMwstAmt + shippingMwstAmt;

  const page = doc.addPage([W, H]);

  const right = (text: string, rx: number, y: number, size: number, font: typeof R, color = BLACK) => {
    page.drawText(text, { x: rx - font.widthOfTextAtSize(text, size) - 4, y, size, font, color });
  };

  let y = H - MT; // 785

  // ── TOP BORDER ──
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 2, color: BLACK });
  y -= 9;

  // ── SENDER SMALL ──
  page.drawText("KB ELEMENTS GmbH · Im Weidchen 21 · 52353 Düren", {
    x: ML, y, size: 7.5, font: R, color: GREY,
  });
  y -= 4;
  page.drawLine({ start: { x: ML, y }, end: { x: ML + CW * 0.53, y }, thickness: 0.5, color: rgb(0.75, 0.75, 0.75) });
  y -= 14;

  // ── HEADER: Kunde links, Firma rechts ──
  const headerTopY = y;

  // RIGHT: Firma
  const coName = "KB ELEMENTS GmbH";
  page.drawText(coName, {
    x: W - MR - B.widthOfTextAtSize(coName, 16) - 4,
    y: headerTopY, size: 16, font: B, color: BLACK,
  });
  const coAddr = "Im Weidchen 21 · 52353 Düren";
  right(coAddr, W - MR, headerTopY - 22, 9, R, DGREY);
  right("verkauf@kbelements.de", W - MR, headerTopY - 36, 8, R, GREY);

  // LEFT: Kunde
  page.drawText(inv.customerName, { x: ML, y: headerTopY, size: 10, font: B, color: BLACK });
  const addrLines = (inv.customerAddress || "").split("\n").filter((l) => l.trim());
  let custY = headerTopY - 15;
  for (const line of addrLines) {
    page.drawText(line, { x: ML, y: custY, size: 10, font: R, color: DGREY });
    custY -= 14;
  }

  const headerH = Math.max(50, 15 + addrLines.length * 14);
  y = headerTopY - headerH - 40;

  // ── STORNO ──
  if (isStorniert) {
    page.drawText("STORNIERT", {
      x: 130, y: 390, size: 68, font: B,
      color: RED, opacity: 0.09,
      rotate: degrees(-35),
    });
    const badgeTxt = "STORNIERT";
    const badgeW = B.widthOfTextAtSize(badgeTxt, 11) + 24;
    page.drawRectangle({ x: ML, y: y - 4, width: badgeW, height: 22, color: RED });
    page.drawText(badgeTxt, { x: ML + 12, y: y + 3, size: 11, font: B, color: rgb(1, 1, 1) });
    y -= 36;
  }

  // ── TITEL + META ──
  const titleY = y;
  page.drawText("Rechnung", { x: ML, y: titleY, size: 26, font: B, color: BLACK });

  const metaRows: [string, string][] = [
    ["Rechnungs-Nr:", inv.number],
    ["Datum:", deDate(inv.date)],
    ["Lieferdatum:", deDate(inv.date)],
  ];
  if (inv.customerNum) metaRows.push(["Kunden-Nr:", inv.customerNum]);

  let metaY = titleY + 5;
  for (const [label, val] of metaRows) {
    page.drawText(label, { x: W - MR - 175, y: metaY, size: 9, font: R, color: GREY });
    right(val, W - MR, metaY, 9, B);
    metaY -= 14;
  }

  y = titleY - 14 - 11; // below title + 4mm

  // ── TABELLE ──
  const TABLE_RIGHT = T.gpR;
  const TH_H = 23;

  page.drawRectangle({ x: ML, y: y - TH_H, width: CW, height: TH_H, color: LGREY });
  page.drawLine({ start: { x: ML, y }, end: { x: TABLE_RIGHT, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  page.drawLine({ start: { x: ML, y: y - TH_H }, end: { x: TABLE_RIGHT, y: y - TH_H }, thickness: 1.5, color: BLACK });

  const thY = y - TH_H + 7;
  page.drawText("Pos.", { x: T.pos + 4, y: thY, size: 8.5, font: B, color: BLACK });
  page.drawText("Menge", { x: T.qty + 4, y: thY, size: 8.5, font: B, color: BLACK });
  page.drawText("Art.-Nr.", { x: T.sku + 4, y: thY, size: 8.5, font: B, color: BLACK });
  page.drawText("Bezeichnung", { x: T.desc + 4, y: thY, size: 8.5, font: B, color: BLACK });
  right("MwSt.", T.mwstR, thY, 8.5, B);
  right("E.-Preis", T.epR, thY, 8.5, B);
  right("G.-Preis", TABLE_RIGHT, thY, 8.5, B);

  y -= TH_H;

  // Zeilen
  const ROW_H = 22;
  for (const it of inv.items) {
    const rowTextY = y - ROW_H + 7;
    page.drawLine({ start: { x: ML, y: y - ROW_H }, end: { x: TABLE_RIGHT, y: y - ROW_H }, thickness: 0.4, color: rgb(0.88, 0.88, 0.88) });

    page.drawText(String(it.pos), { x: T.pos + 4, y: rowTextY, size: 9, font: R, color: DGREY });
    page.drawText(de(it.quantity), { x: T.qty + 4, y: rowTextY, size: 9, font: R, color: DGREY });

    const skuStr = it.skus.map((s) => s.sku).join(" + ");
    if (skuStr) {
      const truncSku = truncate(skuStr, T.sku + 70 - T.sku - 8, R, 7.5);
      page.drawText(truncSku, { x: T.sku + 4, y: rowTextY, size: 7.5, font: R, color: RED });
    }

    const descRaw = it.description.replace(/\n/g, " ");
    const desc = truncate(descRaw, T.mwstR - T.desc - 50 - 8, R, 9);
    page.drawText(desc, { x: T.desc + 4, y: rowTextY, size: 9, font: R, color: BLACK });

    right(`${inv.mwstRate},00 %`, T.mwstR, rowTextY, 9, R, DGREY);
    right(`${de(it.unitPrice)} EUR`, T.epR, rowTextY, 9, R, DGREY);
    right(`${de(it.quantity * it.unitPrice)} EUR`, TABLE_RIGHT, rowTextY, 9, R, BLACK);

    y -= ROW_H;
  }

  // Versandzeile
  if (shipping > 0) {
    const rowTextY = y - ROW_H + 7;
    page.drawRectangle({ x: ML, y: y - ROW_H, width: CW, height: ROW_H, color: rgb(0.98, 0.98, 0.98) });
    page.drawLine({ start: { x: ML, y: y - ROW_H }, end: { x: TABLE_RIGHT, y: y - ROW_H }, thickness: 0.4, color: rgb(0.88, 0.88, 0.88) });
    page.drawText("—", { x: T.pos + 4, y: rowTextY, size: 9, font: R, color: DGREY });
    page.drawText("1,00", { x: T.qty + 4, y: rowTextY, size: 9, font: R, color: DGREY });
    page.drawText("VERSAND", { x: T.sku + 4, y: rowTextY, size: 7.5, font: R, color: GREY });
    page.drawText("Versand / Transport", { x: T.desc + 4, y: rowTextY, size: 9, font: R, color: BLACK });
    right(`${shippingMwst},00 %`, T.mwstR, rowTextY, 9, R, DGREY);
    right(`${de(shipping)} EUR`, T.epR, rowTextY, 9, R, DGREY);
    right(`${de(shipping)} EUR`, TABLE_RIGHT, rowTextY, 9, R, BLACK);
    y -= ROW_H;
  }

  y -= 17;

  // ── NOTIZ ──
  if (inv.notes) {
    const note = inv.notes.replace(/\n/g, " ");
    page.drawText(note, { x: ML, y, size: 9, font: R, color: DGREY, maxWidth: CW * 0.55 });
    y -= 22;
  }

  // ── SUMMEN ──
  const TOTALS_W = 215;
  const TOTALS_X = W - MR - TOTALS_W;
  const TR_H = 19;

  const totals: [string, string, boolean][] = [];
  if (sameMwst) {
    totals.push([`Gesamt Netto (${inv.mwstRate},00 %)`, `${de(totalNetto)} EUR`, false]);
    if (inv.mwstRate > 0) totals.push([`zzgl. MwSt (${inv.mwstRate},00 %)`, `${de(totalMwstAmt)} EUR`, false]);
  } else {
    totals.push([`Netto Produkte (${inv.mwstRate},00 %)`, `${de(productNetto)} EUR`, false]);
    if (inv.mwstRate > 0) totals.push([`zzgl. MwSt (${inv.mwstRate},00 %)`, `${de(productMwstAmt)} EUR`, false]);
    totals.push([`Netto Versand (${shippingMwst},00 %)`, `${de(shippingNetto)} EUR`, false]);
    if (shippingMwst > 0) totals.push([`zzgl. MwSt (${shippingMwst},00 %)`, `${de(shippingMwstAmt)} EUR`, false]);
  }
  totals.push(["Rechnungsbetrag", `${de(bruttoGesamt)} EUR`, true]);
  totals.push(["Zahlbetrag", `${de(bruttoGesamt)} EUR`, true]);

  const TOTALS_H = totals.length * TR_H + 2;
  page.drawRectangle({
    x: TOTALS_X, y: y - TOTALS_H, width: TOTALS_W, height: TOTALS_H,
    borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 1, color: rgb(1, 1, 1),
  });

  let ty = y - 3;
  for (let i = 0; i < totals.length; i++) {
    const [label, val, bold] = totals[i];
    const font = bold ? B : R;
    const fsize = bold ? 10 : 9.5;

    if (bold) {
      page.drawLine({ start: { x: TOTALS_X, y: ty + 3 }, end: { x: TOTALS_X + TOTALS_W, y: ty + 3 }, thickness: 2, color: BLACK });
    }

    page.drawText(label, { x: TOTALS_X + 7, y: ty - 12, size: fsize, font, color: BLACK });
    right(val, TOTALS_X + TOTALS_W, ty - 12, fsize, font);

    if (i < totals.length - 1) {
      page.drawLine({ start: { x: TOTALS_X, y: ty - TR_H }, end: { x: TOTALS_X + TOTALS_W, y: ty - TR_H }, thickness: 0.3, color: rgb(0.87, 0.87, 0.87) });
    }
    ty -= TR_H;
  }

  y -= TOTALS_H + 12;

  // ── ZAHLUNGSINFO ──
  if (inv.paymentMethod === "bar") {
    right("Bezahlt: Bar", W - MR, y, 8.5, R, GREY);
  } else if (inv.paymentInfo) {
    right(`${inv.paymentInfo}  ${de(bruttoGesamt)} EUR`, W - MR, y, 8.5, R, GREY);
  }

  // ── FOOTER ──
  const FY = 55;
  page.drawLine({ start: { x: ML, y: FY }, end: { x: W - MR, y: FY }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });

  const colW = CW / 3;
  const FS = 7.5;

  const footer = [
    { x: ML, lines: [{ b: true, t: "KB ELEMENTS GmbH" }, { b: false, t: "Im Weidchen 21" }, { b: false, t: "52353 Düren" }] },
    { x: ML + colW, lines: [{ b: false, t: "Amtsgericht Düren, HRB 8363" }, { b: false, t: "USt-ID/VAT-ID DE323 000 595" }, { b: false, t: "Steuer-Nr. 207/572/01773" }, { b: false, t: "Geschäftsführer: Hassan Karime" }] },
    { x: ML + colW * 2, lines: [{ b: false, t: "Bank 1: Sparkasse Düren" }, { b: false, t: "IBAN: DE25 3955 0110 1201 3854 97" }, { b: false, t: "Bank 2: Sparkasse Heidelberg" }, { b: false, t: "IBAN: DE82 6725 0020 0009 2936 55" }] },
  ];

  for (const col of footer) {
    let fy = FY - 6;
    for (const { b, t } of col.lines) {
      page.drawText(t, { x: col.x, y: fy, size: FS, font: b ? B : R, color: GREY });
      fy -= 11;
    }
  }

  const pgTxt = "Seite: 1";
  page.drawText(pgTxt, { x: W - MR - R.widthOfTextAtSize(pgTxt, 7) - 4, y: 17, size: 7, font: R, color: rgb(0.7, 0.7, 0.7) });

  const pdfBytes = await doc.save();

  // Embed ZUGFeRD 2.1 XML (EN 16931) and XMP metadata
  const reloaded = await PDFDocument.load(pdfBytes);

  const xmlString = generateZugferdXml(inv);
  await reloaded.attach(Buffer.from(xmlString, "utf-8"), "factur-x.xml", {
    mimeType: "application/xml",
    description: "ZUGFeRD 2.1 EN16931",
    afRelationship: AFRelationship.Alternative,
  });

  const xmpBytes = Buffer.from(generateZugferdXmp(), "utf-8");
  const xmpStream = reloaded.context.stream(xmpBytes, {
    Type: "Metadata",
    Subtype: "XML",
    Length: xmpBytes.length,
  });
  reloaded.catalog.set(PDFName.of("Metadata"), reloaded.context.register(xmpStream));

  return reloaded.save();
}
