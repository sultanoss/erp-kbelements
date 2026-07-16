import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  // Only allow DHL API domains to prevent SSRF
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }
  const allowed = ["api-sandbox.dhl.com", "api-eu.dhl.com", "cig.dhl.de"];
  if (!allowed.some((h) => parsed.hostname === h || parsed.hostname.endsWith("." + h))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const pdfRes = await fetch(url);
  if (!pdfRes.ok) {
    return new NextResponse("Label fetch failed", { status: 502 });
  }

  const pdfBytes = await pdfRes.arrayBuffer();
  const srcDoc = await PDFDocument.load(pdfBytes);
  const newDoc = await PDFDocument.create();
  const [page] = await newDoc.copyPages(srcDoc, [0]);
  newDoc.addPage(page);

  // DHL combines outbound + return label on a single page when dhlRetoure is used.
  // Crop to the top half to show only the outbound shipping label.
  if (srcDoc.getPageCount() === 1 && req.nextUrl.searchParams.get("crop") === "1") {
    const addedPage = newDoc.getPages()[0];
    const { width, height } = addedPage.getSize();
    // PDF coords: y=0 is bottom, y=height is top → top half starts at y=height/2
    addedPage.setCropBox(0, height / 2, width, height / 2);
  }

  const outBytes = await newDoc.save();

  return new NextResponse(Buffer.from(outBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "no-store",
    },
  });
}
