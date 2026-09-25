import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generatePalletLabelPdf } from "@/lib/ait-pallet-label-pdf";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const sku = (form.get("sku") as string | null) ?? "";
  const anzahl = parseInt((form.get("anzahl") as string) ?? "1", 10) || 1;
  const lieferscheinNr = (form.get("lieferscheinNr") as string | null) ?? "";
  const abholdatum = (form.get("abholdatum") as string | null) ?? new Date().toISOString().slice(0, 10);
  const anzahlLabels = Math.max(1, Math.min(50, parseInt((form.get("anzahlLabels") as string) ?? "1", 10) || 1));

  if (!sku) return NextResponse.json({ error: "SKU fehlt" }, { status: 400 });

  const pdfBytes = await generatePalletLabelPdf({ sku, anzahl, lieferscheinNr, abholdatum, anzahlLabels });
  const pdf = Buffer.from(pdfBytes);

  const filename = `Palettenlabel_${sku}_${anzahlLabels}x.pdf`;

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
