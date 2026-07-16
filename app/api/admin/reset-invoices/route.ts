import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// EINMALIGE LÖSCH-ROUTE — nach Verwendung sofort löschen!
// Löscht alle Invoice-Datensätze (InvoiceItem + InvoiceItemSku via Cascade).
export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count } = await prisma.invoice.deleteMany({});
  return NextResponse.json({ deleted: count });
}
