const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkOrder(orderNumber) {
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { orderNumber: { contains: orderNumber, mode: "insensitive" } },
        { externalId: { contains: orderNumber, mode: "insensitive" } },
      ],
    },
    include: { shipments: { include: { items: true } } },
  });

  if (!order) { console.log(orderNumber, "→ Bestellung nicht gefunden"); return; }
  console.log("\n=== ORDER:", orderNumber, "===");
  console.log("status:", order.status, "| id:", order.id);
  console.log("shipment items:", order.shipments[0]?.items?.map(i => `${i.internalSku} x${i.quantity} (${i.warehouse})`).join(", ") || "keine");

  const invoices = await prisma.invoice.findMany({
    where: { orderId: order.id },
    include: { items: { include: { skus: true } } },
  });

  for (const inv of invoices) {
    console.log("INVOICE:", inv.number, "| status:", inv.status);
    for (const it of inv.items) {
      console.log("  pos:", it.description, "| qty:", it.quantity, "| skus:", it.skus.length > 0 ? JSON.stringify(it.skus.map(s => `${s.sku}(${s.lager})`)) : "KEINE SKUs!");
    }
  }
}

async function run() {
  await checkOrder("M37ZRL5");
  await checkOrder("17-14921-39581");
}

run()
  .then(() => prisma["$disconnect"]())
  .catch(e => { console.error(e.message); prisma["$disconnect"](); });
