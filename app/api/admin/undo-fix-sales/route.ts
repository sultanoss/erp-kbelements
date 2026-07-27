import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Deletes all Sale records created in the last 10 minutes by the fix-missing-sales endpoint
export async function POST(req: Request) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== "kb-backfill-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const result = await prisma.sale.deleteMany({
    where: { createdAt: { gte: tenMinutesAgo } },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
