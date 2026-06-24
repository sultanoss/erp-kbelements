import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
p.item.deleteMany({ where: { sku: { startsWith: "KBE-START-" } } })
  .then((r) => console.log(`✓ ${r.count} Test-Artikel geloescht.`))
  .catch(console.error)
  .finally(() => p.$disconnect());
