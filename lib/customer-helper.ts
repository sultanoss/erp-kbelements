import { prisma } from "@/lib/prisma";

export async function generateCustomerNum(): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2); // "26"
  const prefix = `KN-${year}-`;

  const [b2bList, b2cList] = await Promise.all([
    prisma.b2bCustomer.findMany({
      where: { customerNum: { startsWith: prefix } },
      select: { customerNum: true },
    }),
    prisma.b2cCustomer.findMany({
      where: { customerNum: { startsWith: prefix } },
      select: { customerNum: true },
    }),
  ]);

  const allNums = [...b2bList, ...b2cList]
    .map((c) => parseInt(c.customerNum!.replace(prefix, ""), 10))
    .filter((n) => !isNaN(n));

  // Startet bei 03 — 01 und 02 werden manuell vergeben
  const next = allNums.length > 0 ? Math.max(...allNums) + 1 : 3;
  return `${prefix}${String(next).padStart(2, "0")}`;
}
