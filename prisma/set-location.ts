import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
p.item.updateMany({ data: { location: "DE" } })
  .then((r) => console.log(`✓ ${r.count} Artikel auf "DE" gesetzt.`))
  .catch(console.error)
  .finally(() => p.$disconnect());
