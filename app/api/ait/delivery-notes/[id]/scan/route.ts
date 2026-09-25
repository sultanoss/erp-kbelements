import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await prisma.aitDeliveryNote.findUnique({
    where: { id },
    select: { signedScanData: true, signedScanMime: true },
  });

  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!note.signedScanData) return NextResponse.json({ error: "Kein Scan vorhanden" }, { status: 404 });

  return new NextResponse(note.signedScanData, {
    headers: {
      "Content-Type": note.signedScanMime ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="scan-${id}"`,
    },
  });
}
