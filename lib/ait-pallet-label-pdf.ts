import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { robotoRegular, robotoBold } from "./pdf-fonts";

export type PalletLabelInput = {
  sku: string;
  anzahl: number;
  lieferscheinNr: string;
  abholdatum: string;
  anzahlLabels: number;
};

// A4 landscape: 842 × 595 pt
const W = 842, H = 595;
const PAD = 56;

const BLACK = rgb(0, 0, 0);
const DGREY = rgb(0.25, 0.25, 0.25);
const GREY  = rgb(0.55, 0.55, 0.55);
const LGREY = rgb(0.9, 0.9, 0.9);

export async function generatePalletLabelPdf(input: PalletLabelInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const R = await doc.embedFont(robotoRegular);
  const B = await doc.embedFont(robotoBold);

  const deDate = (s: string) => {
    const [y, m, d] = s.split("-");
    return `${d}.${m}.${y}`;
  };

  for (let i = 0; i < input.anzahlLabels; i++) {
    const page = doc.addPage([W, H]);

    const line = (x1: number, y1: number, x2: number, y2: number, color = LGREY, t = 1) =>
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness: t });

    const text = (t: string, x: number, y: number, size: number, font: typeof R, color = BLACK) =>
      page.drawText(t, { x, y, size, font, color });

    const center = (t: string, y: number, size: number, font: typeof R, color = BLACK) => {
      const w = font.widthOfTextAtSize(t, size);
      page.drawText(t, { x: (W - w) / 2, y, size, font, color });
    };

    // ── Rahmen ────────────────────────────────────────────────────────────
    page.drawRectangle({ x: PAD - 8, y: PAD - 8, width: W - 2 * (PAD - 8), height: H - 2 * (PAD - 8), borderColor: LGREY, borderWidth: 1.5, color: rgb(1, 1, 1) });

    // ── SKU (sehr groß, zentriert) ────────────────────────────────────────
    center(input.sku, H - PAD - 80, 72, B, BLACK);

    line(PAD, H - PAD - 95, W - PAD, H - PAD - 95, LGREY, 1);

    // ── Anzahl ────────────────────────────────────────────────────────────
    center(`${input.anzahl} Stück`, H - PAD - 160, 42, B, DGREY);

    line(PAD, H - PAD - 180, W - PAD, H - PAD - 180, LGREY, 0.8);

    // ── Lieferschein-Nr. + Abholdatum ─────────────────────────────────────
    const midX = W / 2;

    text("Lieferschein-Nr.", PAD, H - PAD - 230, 11, R, GREY);
    text(input.lieferscheinNr || "—", PAD, H - PAD - 250, 22, B, BLACK);

    text("Abholdatum", midX + 20, H - PAD - 230, 11, R, GREY);
    text(deDate(input.abholdatum), midX + 20, H - PAD - 250, 22, B, BLACK);

    // ── Label-Nummer (klein, unten rechts) ────────────────────────────────
    if (input.anzahlLabels > 1) {
      const lbl = `${i + 1} / ${input.anzahlLabels}`;
      const lw = R.widthOfTextAtSize(lbl, 9);
      page.drawText(lbl, { x: W - PAD - lw, y: PAD - 4, size: 9, font: R, color: GREY });
    }
  }

  return doc.save();
}
