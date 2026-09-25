import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { robotoRegular, robotoBold } from "./pdf-fonts";
import type { AitDeliveryNote, AitDeliveryNoteLine } from "@prisma/client";

export type DeliveryNoteWithLines = AitDeliveryNote & { lines: AitDeliveryNoteLine[] };

const W = 595, H = 842;
const ML = 56, MR = 56;
const CW = W - ML - MR;

const BLACK = rgb(0, 0, 0);
const GREY  = rgb(0.5, 0.5, 0.5);
const DGREY = rgb(0.2, 0.2, 0.2);
const LGREY = rgb(0.93, 0.93, 0.93);
const RED   = rgb(0.753, 0.094, 0.165);

function deDate(d: Date) {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function generateAitDeliveryNotePdf(note: DeliveryNoteWithLines): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const R = await doc.embedFont(robotoRegular);
  const B = await doc.embedFont(robotoBold);

  const page = doc.addPage([W, H]);

  let y = H - 50;

  const text = (t: string, x: number, yPos: number, size: number, font: typeof R, color = BLACK) =>
    page.drawText(t, { x, y: yPos, size, font, color });

  const right = (t: string, rx: number, yPos: number, size: number, font: typeof R, color = BLACK) =>
    page.drawText(t, { x: rx - font.widthOfTextAtSize(t, size), y: yPos, size, font, color });

  const line = (x1: number, y1: number, x2: number, y2: number, color = GREY, thickness = 0.5) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness });

  // ── Absender (links oben) ──────────────────────────────────────────────
  text("KB ELEMENTS GmbH", ML, y, 11, B, BLACK);
  y -= 15;
  text("Im Weidchen 21",   ML, y, 9,  R, DGREY);
  y -= 13;
  text("52353 Düren",      ML, y, 9,  R, DGREY);
  y -= 13;
  text("Deutschland",      ML, y, 9,  R, GREY);

  // ── Titel + Nummer (rechts oben) ───────────────────────────────────────
  const titleY = H - 50;
  right("LIEFERSCHEIN", W - MR, titleY, 15, B, RED);
  right(`Nr.: ${note.number}`, W - MR, titleY - 18, 9, R, DGREY);
  right(`Erstellt: ${deDate(note.createdAt)}`, W - MR, titleY - 32, 9, R, GREY);
  right(`Abholdatum: ${deDate(note.pickupDate)}`, W - MR, titleY - 46, 9, B, BLACK);

  y = H - 140;

  // ── Empfänger ──────────────────────────────────────────────────────────
  text("An:", ML, y, 8, R, GREY);
  y -= 14;
  text("AIT Home Delivery", ML, y, 10, B, BLACK);
  y -= 14;
  text("Lager Hannover",    ML, y, 9,  R, DGREY);

  y -= 28;
  line(ML, y, W - MR, y, GREY, 1);
  y -= 18;

  // ── Tabellen-Header ────────────────────────────────────────────────────
  const colSku     = ML;
  const colDesc    = ML + 90;
  const colPallets = W - MR - 60;
  const colQty     = W - MR;

  page.drawRectangle({ x: ML, y: y - 4, width: CW, height: 18, color: LGREY });

  text("SKU",          colSku,     y, 8, B, DGREY);
  text("Bezeichnung",  colDesc,    y, 8, B, DGREY);
  right("Paletten",    colPallets, y, 8, B, DGREY);
  right("Menge",       colQty,     y, 8, B, DGREY);

  y -= 6;
  line(ML, y, W - MR, y, GREY, 0.5);
  y -= 14;

  // ── Tabellenzeilen ─────────────────────────────────────────────────────
  let totalQty = 0;
  let totalPallets = 0;
  for (const l of note.lines) {
    totalQty += l.quantity;
    totalPallets += (l.palletCount ?? 1);
    const descMaxW = colPallets - colDesc - 10;
    let desc = l.description;
    while (desc.length > 0 && R.widthOfTextAtSize(desc, 9) > descMaxW) {
      desc = desc.slice(0, -1);
    }
    if (desc !== l.description) desc += "…";

    text(l.sku,                       colSku,     y, 9, R, BLACK);
    text(desc,                        colDesc,    y, 9, R, DGREY);
    right(`${l.palletCount ?? 1}`,    colPallets, y, 9, R, DGREY);
    right(`${l.quantity}`,            colQty,     y, 9, B, BLACK);

    y -= 16;
    line(ML, y + 4, W - MR, y + 4, LGREY, 0.5);
  }

  y -= 6;
  line(ML, y, W - MR, y, GREY, 1);
  y -= 16;

  right(`Paletten: ${totalPallets}  ·  Gesamt: ${totalQty} Stück`, W - MR, y, 9, B, BLACK);

  // ── Bemerkungen ────────────────────────────────────────────────────────
  if (note.notes) {
    y -= 24;
    text("Bemerkungen:", ML, y, 8, B, DGREY);
    y -= 14;
    text(note.notes, ML, y, 9, R, DGREY);
  }

  // ── Unterschriftsfelder ───────────────────────────────────────────────
  y = 160;
  line(ML, y, W - MR, y, GREY, 0.5);
  y -= 16;

  const halfW = CW / 2;
  const colR2 = ML + halfW + 20;

  text("FAHRER",     ML,    y, 8, B, DGREY);
  text("KB ELEMENTS", colR2, y, 8, B, DGREY);
  y -= 20;

  text("Name:", ML, y, 8, R, GREY);
  line(ML + 30, y - 2, ML + halfW - 10, y - 2, GREY, 0.5);
  text("Name:", colR2, y, 8, R, GREY);
  line(colR2 + 30, y - 2, W - MR, y - 2, GREY, 0.5);

  y -= 20;
  text("KFZ-Kennzeichen:", ML, y, 8, R, GREY);
  line(ML + 80, y - 2, ML + halfW - 10, y - 2, GREY, 0.5);

  y -= 24;
  text("Datum:", ML, y, 8, R, GREY);
  line(ML + 32, y - 2, ML + halfW - 10, y - 2, GREY, 0.5);
  text("Datum:", colR2, y, 8, R, GREY);
  line(colR2 + 32, y - 2, W - MR, y - 2, GREY, 0.5);

  y -= 30;
  text("Unterschrift:", ML, y, 8, R, GREY);
  line(ML + 55, y - 2, ML + halfW - 10, y - 2, GREY, 0.5);
  text("Unterschrift:", colR2, y, 8, R, GREY);
  line(colR2 + 55, y - 2, W - MR, y - 2, GREY, 0.5);

  // ── Footer ────────────────────────────────────────────────────────────
  line(ML, 40, W - MR, 40, GREY, 0.3);
  text("KB ELEMENTS GmbH · Im Weidchen 21 · 52353 Düren", ML, 28, 7, R, GREY);

  return doc.save();
}
