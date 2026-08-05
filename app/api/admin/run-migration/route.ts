import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$executeRaw`ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "positionItemIds" TEXT[] DEFAULT '{}'`;
    return NextResponse.json({ ok: true, message: "Migration erfolgreich" });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
