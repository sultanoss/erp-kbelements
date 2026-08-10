import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-time migration route — REMOVE AFTER USE
export async function POST(req: Request) {
  const secret = req.headers.get("x-migrate-secret");
  if (secret !== "kb-migrate-2026-enum") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$executeRaw`ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'SHIPMENT'`;
    await prisma.$executeRaw`ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'STORNO'`;
    await prisma.$executeRaw`ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'INVOICE'`;
    return NextResponse.json({ ok: true, message: "Enum values added successfully" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
