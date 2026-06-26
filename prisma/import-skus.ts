import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const skus = [
  "24 12 Volt",
  "24 Android",
  "32 Android",
  "32 Webos",
  "100 QLED Webos",
  "ELK75LP-Black",
  "ELK75LP-Grey",
  "ELK75LP-Blue",
  "ELK85LP",
  "ELK204",
  "ELK60FB1",
  "ELK105",
  "ELK106",
  "ELK60CR1",
  "ELK29PB1",
  "ELK77CR1",
  "ELK60PB1",
  "ELK111",
  "ELK112",
  "ELK60GH2",
  "ELK70GH1",
  "ELK90GH1",
  "ELK60GH1",
  "ELK76GH1",
  "ELK25MB1",
  "ELK45EV1",
  "ELK75EV1",
  "ELK75EV2",
  "ELK75DV1",
  "ELK75DV2",
  "ELK75DV3",
  "ELK60TM1",
  "ELK90DV1",
  "ELK154C60",
  "ELK156S60B",
  "ELK156S60S",
  "ELK156S90B",
  "ELK156S90S",
  "ELK151H80",
  "ELK150H60",
  "ELK60PR1",
  "ELK60PR2",
  "ELK60AB1",
  "ELK26BS1",
  "ELK26BR1",
  "ELK223",
  "ELK201CS",
  "ELK221VG",
  "ELK221VW",
  "ELK130GH4",
  "ELK132GH5",
  "ELK131GH5",
  "ELK301J",
  "ELK302J",
  "ELK303G",
  "ELK304FP",
  "ELK305FP",
  "ELK306FP",
  "ELK307HB",
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const sku of skus) {
    const existing = await prisma.item.findUnique({ where: { sku } });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.item.create({
      data: { sku, stock: 0, minStock: 0 },
    });
    created++;
  }

  console.log(`✓ ${created} Artikel importiert, ${skipped} bereits vorhanden.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
