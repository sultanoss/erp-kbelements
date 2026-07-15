import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const items = await prisma.item.findMany({
    where: {
      OR: [
        { sku: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { sku: true, name: true, stock: true, stockNS: true },
    take: 10,
    orderBy: { sku: "asc" },
  });

  return NextResponse.json(items);
}
