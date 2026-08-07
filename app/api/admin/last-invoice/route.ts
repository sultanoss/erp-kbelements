import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const inv = await prisma.invoice.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      number: true,
      customerName: true,
      customerNum: true,
      date: true,
      createdAt: true,
      docType: true,
      marketplace: true,
      bezahlt: true,
    },
  });
  return NextResponse.json(inv);
}
