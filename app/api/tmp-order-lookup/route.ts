import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("s");
  if (secret !== "kb-tmp-9x2z") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const externalId = req.nextUrl.searchParams.get("id");
  if (!externalId) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const order = await prisma.order.findFirst({
    where: { externalId },
    include: { shipments: true, items: true },
  });

  return NextResponse.json(order);
}
