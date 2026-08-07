import { prisma } from "@/lib/prisma";

export async function generateCustomerNum(): Promise<string> {
  const [b2bList, b2cList] = await Promise.all([
    prisma.b2bCustomer.findMany({
      where: { customerNum: { startsWith: "KB-" } },
      select: { customerNum: true },
    }),
    prisma.b2cCustomer.findMany({
      where: { customerNum: { startsWith: "KB-" } },
      select: { customerNum: true },
    }),
  ]);

  const allNums = [...b2bList, ...b2cList]
    .map((c) => parseInt(c.customerNum!.replace("KB-", ""), 10))
    .filter((n) => !isNaN(n));

  const next = allNums.length > 0 ? Math.max(...allNums) + 1 : 2601;
  return `KB-${next}`;
}
