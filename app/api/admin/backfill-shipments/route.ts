import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-time endpoint: marks all shipments created BEFORE today as salesCreated=true
// Stock was already decremented at label creation — this just stops them from
// being picked up by "Versand fertig" going forward.
export async function POST(req: Request) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== "kb-backfill-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const result = await prisma.shipment.updateMany({
    where: {
      salesCreated: false,
      createdAt: { lt: todayStart },
    },
    data: { salesCreated: true },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
