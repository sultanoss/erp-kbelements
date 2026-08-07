const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({ datasources: { db: { url: '[SENSITIVE]' } } })
async function main() {
  const order = await prisma.order.findFirst({
    where: { externalId: 'cbn4yr6cty' },
    include: {
      shipments: true,
      items: true,
    }
  })
  console.log(JSON.stringify(order, null, 2))
}
main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect() })
