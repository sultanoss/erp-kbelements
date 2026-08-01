import { prisma } from "@/lib/prisma";
import { fetchEbayInventorySkus } from "@/lib/connectors/ebay";
import SyncClient from "./SyncClient";

function suggestInternalSkus(marketplaceSku: string, allSkus: string[]): string {
  const parts = marketplaceSku.split(/[\/,\s]+/).filter((p) => p.length >= 2);
  const matched: string[] = [];

  for (const part of parts) {
    let candidates: string[];
    if (part.toUpperCase().startsWith("ELK")) {
      // Part starts with ELK → find ERP SKU that starts with this part
      candidates = allSkus.filter((s) => s.toUpperCase().startsWith(part.toUpperCase()));
      // Prefer exact match, then shortest (most specific)
      candidates.sort((a, b) => (a.toUpperCase() === part.toUpperCase() ? -1 : b.toUpperCase() === part.toUpperCase() ? 1 : a.length - b.length));
    } else {
      // Part doesn't start with ELK → find ERP SKU that ends with this part
      candidates = allSkus.filter((s) => s.toUpperCase().endsWith(part.toUpperCase()));
      candidates.sort((a, b) => a.length - b.length);
    }
    for (const c of candidates) {
      if (!matched.includes(c)) matched.push(c);
    }
  }

  return matched.join(", ");
}

export default async function PortaleBestandSyncPage() {
  const [mappings, orderEbaySkus, orderOutletSkus, apiEbaySkus, apiOutletSkus, allItems] = await Promise.all([
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
    prisma.item.findMany({ select: { sku: true } }),
  ]);

  const allSkus = allItems.map((i) => i.sku);

  // Merge API SKUs with order SKUs — API takes priority for title, deduplicate by marketplaceSku
  function mergeSkus(
    apiSkus: { marketplaceSku: string; title: string | null }[],
    orderSkus: { marketplaceSku: string; title: string | null }[]
  ) {
    const map = new Map<string, { marketplaceSku: string; title: string | null }>();
    for (const s of orderSkus) map.set(s.marketplaceSku, s);
    for (const s of apiSkus) map.set(s.marketplaceSku, s);
    return Array.from(map.values()).sort((a, b) => a.marketplaceSku.localeCompare(b.marketplaceSku));
  }

  const ebaySkus = mergeSkus(apiEbaySkus, orderEbaySkus);
  const ebayOutletSkus = mergeSkus(apiOutletSkus, orderOutletSkus);

  // Pre-compute suggestions for unmapped SKUs
  const mappingSet = new Set(mappings.map((m) => `${m.marketplace}:${m.marketplaceSku}`));

  const suggestions: Record<string, string> = {};
  for (const [mp, skuList] of [["EBAY", ebaySkus], ["EBAY_OUTLET", ebayOutletSkus]] as const) {
    for (const s of skuList) {
      const key = `${mp}:${s.marketplaceSku}`;
      if (!mappingSet.has(key)) {
        const suggestion = suggestInternalSkus(s.marketplaceSku, allSkus);
        if (suggestion) suggestions[key] = suggestion;
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Portale Bestand Sync</h1>
      <SyncClient
        mappings={mappings}
        ebaySkus={ebaySkus}
        ebayOutletSkus={ebayOutletSkus}
        suggestions={suggestions}
      />
    </div>
  );
}
