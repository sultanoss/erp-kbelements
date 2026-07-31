import { prisma } from "@/lib/prisma";
import { fetchEbayInventorySkus } from "@/lib/connectors/ebay";
import SyncClient from "./SyncClient";

export default async function PortaleBestandSyncPage() {
  const [mappings, orderEbaySkus, orderOutletSkus, apiEbaySkus, apiOutletSkus] = await Promise.all([
    prisma.skuMapping.findMany({
      orderBy: [{ marketplace: "asc" }, { marketplaceSku: "asc" }],
      include: {
        items: {
          include: { item: { select: { stock: true, sku: true } } },
        },
      },
    }),
    prisma.orderItem.findMany({
      where: { order: { marketplace: "EBAY" } },
      select: { marketplaceSku: true, title: true },
      distinct: ["marketplaceSku"],
    }),
    prisma.orderItem.findMany({
      where: { order: { marketplace: "EBAY_OUTLET" } },
      select: { marketplaceSku: true, title: true },
      distinct: ["marketplaceSku"],
    }),
    fetchEbayInventorySkus("main").catch(() => []),
    fetchEbayInventorySkus("outlet").catch(() => []),
  ]);

  // Merge API SKUs with order SKUs — API takes priority for title, deduplicate by marketplaceSku
  function mergeSkus(
    apiSkus: { marketplaceSku: string; title: string | null }[],
    orderSkus: { marketplaceSku: string; title: string | null }[]
  ) {
    const map = new Map<string, { marketplaceSku: string; title: string | null }>();
    for (const s of orderSkus) map.set(s.marketplaceSku, s);
    for (const s of apiSkus) map.set(s.marketplaceSku, s); // API overwrites order entries
    return Array.from(map.values()).sort((a, b) => a.marketplaceSku.localeCompare(b.marketplaceSku));
  }

  const ebaySkus = mergeSkus(apiEbaySkus, orderEbaySkus);
  const ebayOutletSkus = mergeSkus(apiOutletSkus, orderOutletSkus);

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
