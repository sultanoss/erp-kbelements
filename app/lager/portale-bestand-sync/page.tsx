import { prisma } from "@/lib/prisma";
import SyncClient from "./SyncClient";

export default async function PortaleBestandSyncPage() {
  const [mappings, ebaySkus, ebayOutletSkus] = await Promise.all([
    prisma.skuMapping.findMany({
      orderBy: [{ marketplace: "asc" }, { marketplaceSku: "asc" }],
      include: {
        items: {
          include: { item: { select: { stock: true, sku: true } } },
        },
      },
    }),
    // All distinct eBay SKUs from orders
    prisma.orderItem.findMany({
      where: { order: { marketplace: "EBAY" } },
      select: { marketplaceSku: true, title: true },
      distinct: ["marketplaceSku"],
      orderBy: { marketplaceSku: "asc" },
    }),
    // All distinct eBay Outlet SKUs from orders
    prisma.orderItem.findMany({
      where: { order: { marketplace: "EBAY_OUTLET" } },
      select: { marketplaceSku: true, title: true },
      distinct: ["marketplaceSku"],
      orderBy: { marketplaceSku: "asc" },
    }),
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Portale Bestand Sync</h1>
      <SyncClient
        mappings={mappings}
        ebaySkus={ebaySkus}
        ebayOutletSkus={ebayOutletSkus}
      />
    </div>
  );
}
