import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

const PW = 595, PH = 842; // A4 in points
const ML = 71, MR = 538;  // left margin (25mm), right edge (595-57mm)
const MT = 57;             // top margin (20mm)
const CW = MR - ML;       // content width

function fmt(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function buildPdf(id: string) {
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { pos: "asc" }, include: { skus: true } } },
  });
  if (!inv) return null;

  const doc = await PDFDocument.create();
  const page = doc.addPage([PW, PH]);

  const fR = await doc.embedFont(StandardFonts.Helvetica);
  const fB = await doc.embedFont(StandardFonts.HelveticaBold);

  const c = {
    black:    rgb(0,    0,    0   ),
    gray:     rgb(0.33, 0.33, 0.33),
    lgray:    rgb(0.60, 0.60, 0.60),
    bg:       rgb(0.94, 0.94, 0.94),
    bgLight:  rgb(0.98, 0.98, 0.98),
    border:   rgb(0.88, 0.88, 0.88),
    dkBorder: rgb(0.67, 0.67, 0.67),
  };

  // yFT = distance from TOP; pdf-lib y = PH - yFT
  const dt = (t: string, x: number, yFT: number, f: PDFFont, sz: number, cl = c.black) => {
    if (!t) return;
    try { page.drawText(t, { x, y: PH - yFT, font: f, size: sz, color: cl }); } catch { /* skip unencodable */ }
  };
  const dtr = (t: string, rx: number, yFT: number, f: PDFFont, sz: number, cl = c.black) => {
    dt(t, rx - f.widthOfTextAtSize(t, sz), yFT, f, sz, cl);
  };
  const dl = (x1: number, yFT: number, x2: number, th = 0.5, cl = c.black) => {
    page.drawLine({ start: { x: x1, y: PH - yFT }, end: { x: x2, y: PH - yFT }, thickness: th, color: cl });
  };
  const dr = (x: number, yFT: number, w: number, h: number, cl: ReturnType<typeof rgb>) => {
    page.drawRectangle({ x, y: PH - yFT - h, width: w, height: h, color: cl });
  };

  let cy = MT;

  // --- HEADER ---
  dt("KB ELEMENTS GmbH · Im Weidchen 21 · 52353 Düren", ML, cy + 7, fR, 7.5, c.lgray);
  cy += 10;
  dl(ML, cy, MR, 0.5, c.dkBorder);
  cy += 7;

  const custY = cy;
  dt(inv.customerName ?? "", ML, cy + 9, fB, 10);
  cy += 12;
  const addrLines = (inv.customerAddress ?? "").split("\n").filter(l => l.trim());
  for (const al of addrLines) {
    dt(al, ML, cy + 8, fR, 10);
    cy += 11;
  }

  // Company block (right-aligned)
  dt("KB ELEMENTS GmbH", MR - fB.widthOfTextAtSize("KB ELEMENTS GmbH", 16), custY, fB, 16);
  const a1 = "Im Weidchen 21 · 52353 Düren";
  dt(a1, MR - fR.widthOfTextAtSize(a1, 9), custY + 20, fR, 9);
  const em = "verkauf@kbelements.de";
  dt(em, MR - fR.widthOfTextAtSize(em, 8), custY + 31, fR, 8, c.gray);

  cy = Math.max(cy, custY + 50) + 14;

  // --- TITLE + META ---
  dt("Rechnung", ML, cy + 26, fB, 26);
  const mLX = MR - 145;
  let mY = cy;
  const metaRows: [string, string][] = [
    ["Rechnungs-Nr:", inv.number],
    ["Datum:", fmtDate(inv.date)],
    ["Lieferdatum:", fmtDate(inv.date)],
  ];
  if (inv.customerNum) metaRows.push(["Kunden-Nr:", inv.customerNum]);
  for (const [lbl, val] of metaRows) {
    dt(lbl, mLX, mY + 9, fR, 9, c.lgray);
    dtr(val, MR, mY + 9, fB, 9);
    mY += 12;
  }
  cy = Math.max(cy + 42, mY + 8);

  // --- ITEMS TABLE ---
  const C = {
    pos:   { x: ML,        w: 22 },
    menge: { x: ML + 22,   w: 42 },
    artnr: { x: ML + 64,   w: 80 },
    bez:   { x: ML + 144,  w: 155 },
    mwst:  { x: ML + 299,  w: 50 },
    ep:    { x: ML + 349,  w: 62 },
    gp:    { x: ML + 411,  w: MR - ML - 411 },
  };

  dr(ML, cy, CW, 15, c.bg);
  dl(ML, cy, MR, 1.5);
  dl(ML, cy + 15, MR, 1.5);
  const thY = cy + 10;
  dt("Pos.", C.pos.x + 2, thY, fB, 8.5);
  dt("Menge", C.menge.x + 2, thY, fB, 8.5);
  dt("Art.-Nr.", C.artnr.x + 2, thY, fB, 8.5);
  dt("Bezeichnung", C.bez.x + 2, thY, fB, 8.5);
  dtr("MwSt.", C.mwst.x + C.mwst.w - 2, thY, fB, 8.5);
  dtr("E.-Preis", C.ep.x + C.ep.w - 2, thY, fB, 8.5);
  dtr("G.-Preis", C.gp.x + C.gp.w - 2, thY, fB, 8.5);
  cy += 15;

  const shipping = inv.shippingCost ?? 0;
  const shippingMwst = inv.shippingMwst ?? 19;

  for (const item of inv.items) {
    const descLines = (item.description ?? "").split("\n");
    const rowH = Math.max(14, descLines.length * 11 + 4);
    dl(ML, cy + rowH, MR, 0.5, c.border);
    const base = cy + 9;
    dt(String(item.pos), C.pos.x + 2, base, fR, 9);
    dt(item.quantity.toLocaleString("de-DE", { minimumFractionDigits: 2 }), C.menge.x + 2, base, fR, 9);
    dt(item.skus.map(s => s.sku).join(" + "), C.artnr.x + 2, base, fR, 8.5);
    for (let li = 0; li < descLines.length; li++) {
      dt(descLines[li], C.bez.x + 2, base + li * 11, fR, 9);
    }
    dtr(`${inv.mwstRate},00 %`, C.mwst.x + C.mwst.w - 2, base, fR, 9);
    dtr(`${fmt(item.unitPrice)} EUR`, C.ep.x + C.ep.w - 2, base, fR, 9);
    dtr(`${fmt(item.quantity * item.unitPrice)} EUR`, C.gp.x + C.gp.w - 2, base, fB, 9);
    cy += rowH;
  }

  if (inv.shippingCost !== null && shipping > 0) {
    const rowH = 14;
    dr(ML, cy, CW, rowH, c.bgLight);
    dl(ML, cy + rowH, MR, 0.5, c.border);
    const base = cy + 9;
    dt("-", C.pos.x + 2, base, fR, 9, c.lgray);
    dt("1,00", C.menge.x + 2, base, fR, 9, c.lgray);
    dt("VERSAND", C.artnr.x + 2, base, fR, 8.5, c.lgray);
    dt("Versand / Transport", C.bez.x + 2, base, fR, 9, c.lgray);
    dtr(`${shippingMwst},00 %`, C.mwst.x + C.mwst.w - 2, base, fR, 9, c.lgray);
    dtr(`${fmt(shipping)} EUR`, C.ep.x + C.ep.w - 2, base, fR, 9, c.lgray);
    dtr(`${fmt(shipping)} EUR`, C.gp.x + C.gp.w - 2, base, fB, 9, c.lgray);
    cy += rowH;
  }
  cy += 8;

  if (inv.notes) {
    dt(inv.notes, ML, cy + 9, fR, 9, c.gray);
    cy += 14;
  }

  // --- TOTALS ---
  const bruttoPos = inv.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const bruttoGesamt = bruttoPos + shipping;
  const sameMwst = shippingMwst === inv.mwstRate;
  const prodNetto = inv.mwstRate > 0 ? bruttoPos / (1 + inv.mwstRate / 100) : bruttoPos;
  const prodMwstAmt = bruttoPos - prodNetto;
  const shipNetto = shipping > 0 && shippingMwst > 0 ? shipping / (1 + shippingMwst / 100) : shipping;
  const shipMwstAmt = shipping - shipNetto;

  type TR = { lbl: string; val: string; bold?: boolean; thick?: boolean };
  const totRows: TR[] = [];
  if (sameMwst || shipping === 0) {
    totRows.push({ lbl: `Gesamt Netto (${inv.mwstRate},00 %)`, val: `${fmt(prodNetto + shipNetto)} EUR` });
    if (inv.mwstRate > 0) totRows.push({ lbl: `zzgl. MwSt (${inv.mwstRate},00 %)`, val: `${fmt(prodMwstAmt + shipMwstAmt)} EUR` });
  } else {
    totRows.push({ lbl: `Netto Produkte (${inv.mwstRate},00 %)`, val: `${fmt(prodNetto)} EUR` });
    if (inv.mwstRate > 0) totRows.push({ lbl: `zzgl. MwSt (${inv.mwstRate},00 %)`, val: `${fmt(prodMwstAmt)} EUR` });
    totRows.push({ lbl: `Netto Versand (${shippingMwst},00 %)`, val: `${fmt(shipNetto)} EUR` });
    if (shippingMwst > 0) totRows.push({ lbl: `zzgl. MwSt Vers. (${shippingMwst},00 %)`, val: `${fmt(shipMwstAmt)} EUR` });
  }
  totRows.push({ lbl: "Rechnungsbetrag", val: `${fmt(bruttoGesamt)} EUR`, bold: true, thick: true });
  totRows.push({ lbl: "Zahlbetrag", val: `${fmt(bruttoGesamt)} EUR`, bold: true });

  const totW = 215, totL = MR - totW;
  const totStartY = cy;
  for (const row of totRows) {
    if (row.thick) dl(totL, cy, MR, 2);
    const f = row.bold ? fB : fR;
    const sz = row.bold ? 10.5 : 9.5;
    dt(row.lbl, totL + 5, cy + 9, f, sz);
    dtr(row.val, MR - 5, cy + 9, f, sz);
    cy += 14;
  }
  page.drawRectangle({ x: totL, y: PH - cy, width: totW, height: cy - totStartY, borderColor: c.border, borderWidth: 1 });
  cy += 5;

  if (inv.paymentMethod === "bar") {
    dtr("Bezahlt: Bar", MR, cy + 9, fR, 8.5, c.gray);
  } else if (inv.paymentInfo) {
    dtr(`${inv.paymentInfo} ${fmt(bruttoGesamt)} EUR`, MR, cy + 9, fR, 8.5, c.gray);
  }

  // --- FOOTER (fixed at bottom of page) ---
  const footY = 762;
  dl(ML, footY, MR, 0.5, c.dkBorder);
  const fLH = 9, fSz = 7.5;
  const fc2 = ML + Math.floor(CW / 3), fc3 = ML + Math.floor(CW * 2 / 3);

  let fy = footY + 5;
  dt("KB ELEMENTS GmbH", ML, fy, fB, fSz, c.gray); fy += fLH;
  dt("Im Weidchen 21", ML, fy, fR, fSz, c.gray); fy += fLH;
  dt("52353 Düren", ML, fy, fR, fSz, c.gray);

  fy = footY + 5;
  dt("Amtsgericht Düren, HRB 8363", fc2, fy, fR, fSz, c.gray); fy += fLH;
  dt("USt-ID-/VAT ID- DE323 000 595", fc2, fy, fR, fSz, c.gray); fy += fLH;
  dt("Steuer-Nr. 207/572/01773", fc2, fy, fR, fSz, c.gray); fy += fLH;
  dt("Geschäftsführer: Hassan Karime", fc2, fy, fR, fSz, c.gray);

  fy = footY + 5;
  dt("Bank 1: Sparkasse Düren", fc3, fy, fR, fSz, c.gray); fy += fLH;
  dt("IBAN: DE25 3955 0110 1201 3854 97", fc3, fy, fR, fSz, c.gray); fy += fLH;
  dt("SWIFT: SDUEDE33XXX", fc3, fy, fR, fSz, c.gray); fy += fLH;
  dt("Bank 2: Sparkasse Heidelberg", fc3, fy, fR, fSz, c.gray); fy += fLH;
  dt("IBAN: DE82 6725 0020 0009 2936 55", fc3, fy, fR, fSz, c.gray); fy += fLH;
  dt("SWIFT: SOLADES1HDB", fc3, fy, fR, fSz, c.gray);

  return { inv, pdfBytes: await doc.save() };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await buildPdf(id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { inv, pdfBytes } = result;
  const pdfB64 = Buffer.from(pdfBytes).toString("base64");
  const pdfFilename = `Rechnung-${inv.number}.pdf`;

  const subject = `KB ELEMENTS Rechnung ${inv.number}`;
  const body = [
    "Sehr geehrte Damen und Herren,",
    "",
    "anbei übersenden wir Ihnen die Rechnung als Anhang.",
    "",
    "Bei weiteren Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.",
    "",
    "Mit freundlichen Grüßen / Best regards",
    "",
    "",
    "KB ELEMENTS GmbH",
    "Im Weidchen 21",
    "52353 Düren",
    "",
    "www.kbelements.de",
    "",
    "Amtsgericht Düren – HRB 8363",
    "USt-IdNr.: DE323000595",
    "",
    "P.S. Please consider the environment and do not print this email unless necessary.",
  ].join("\r\n");

  const subjectB64 = `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
  const bodyB64 = Buffer.from(body, "utf-8").toString("base64");
  const boundary = "kb-eml-20250001";

  const eml = [
    "MIME-Version: 1.0",
    "X-Unsent: 1",
    `Subject: ${subjectB64}`,
    "From: verkauf@kbelements.de",
    "To: ",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    bodyB64,
    "",
    `--${boundary}`,
    `Content-Type: application/pdf; name="${pdfFilename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${pdfFilename}"`,
    "",
    pdfB64,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return new NextResponse(eml, {
    headers: {
      "Content-Type": "message/rfc822",
      "Content-Disposition": `attachment; filename="Rechnung-${inv.number}.eml"`,
      "Cache-Control": "no-store",
    },
  });
}
