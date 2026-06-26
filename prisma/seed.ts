import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin123!", 12);

  await prisma.user.upsert({
    where: { email: "radwansultan@hotmail.de" },
    update: {
      name: "Radwan Sultan",
      passwordHash,
      role: Role.ADMIN,
      active: true,
    },
    create: {
      name: "Radwan Sultan",
      email: "radwansultan@hotmail.de",
      passwordHash,
      role: Role.ADMIN,
      active: true,
    },
  });

  await prisma.item.createMany({
    data: [
      { sku: "KBE-START-001", stock: 48, minStock: 12 },
      { sku: "KBE-START-002", stock: 9, minStock: 15 },
      { sku: "KBE-START-003", stock: 120, minStock: 25 },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
