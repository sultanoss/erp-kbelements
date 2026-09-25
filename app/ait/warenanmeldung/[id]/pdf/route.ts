import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateAitDeliveryNotePdf } from "@/lib/ait-delivery-note-pdf";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await prisma.aitDeliveryNote.findUnique({ where: { id }, include: { lines: true } });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pdfBytes = await generateAitDeliveryNotePdf(note);
  const pdf = Buffer.from(pdfBytes);

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${note.number}.pdf"`,
    },
  });
}
