import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // 1. Add customerNum column to B2cCustomer if missing
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "B2cCustomer" ADD COLUMN IF NOT EXISTS "customerNum" TEXT`
  );

  // 2. Find all customers without KB-XXXX number
  const [b2bWithout, b2cWithout, allWithNums] = await Promise.all([
    prisma.b2bCustomer.findMany({
      where: { OR: [{ customerNum: null }, { customerNum: { not: { startsWith: "KB-" } } }] },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, customerNum: true },
    }),
    prisma.b2cCustomer.findMany({
      where: { OR: [{ customerNum: null }, { customerNum: { not: { startsWith: "KB-" } } }] },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.b2bCustomer.findMany({
      where: { customerNum: { startsWith: "KB-" } },
      select: { customerNum: true },
    }),
  ]);

  // 3. Find starting number (after existing KB-XXXX numbers)
  const existingNums = allWithNums
    .map((c) => parseInt(c.customerNum!.replace("KB-", ""), 10))
    .filter((n) => !isNaN(n));
  let counter = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 2601;

  const assigned: { type: string; id: string; name: string; num: string }[] = [];

  // 4. Assign numbers to B2B customers (B2B first, then B2C)
  for (const c of b2bWithout) {
    const num = `KB-${counter++}`;
    await prisma.b2bCustomer.update({ where: { id: c.id }, data: { customerNum: num } });
    assigned.push({ type: "B2B", id: c.id, name: c.name, num });
  }

  // 5. Assign numbers to B2C customers
  for (const c of b2cWithout) {
    const num = `KB-${counter++}`;
    await prisma.b2cCustomer.update({ where: { id: c.id }, data: { customerNum: num } });
    assigned.push({ type: "B2C", id: c.id, name: c.name, num });
  }

  return NextResponse.json({ assigned, total: assigned.length });
}
