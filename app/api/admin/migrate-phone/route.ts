import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "B2bCustomer" ADD COLUMN IF NOT EXISTS "phone" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "B2cCustomer" ADD COLUMN IF NOT EXISTS "phone" TEXT`);
  return NextResponse.json({ ok: true });
}
