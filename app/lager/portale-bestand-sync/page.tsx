import { prisma } from "@/lib/prisma";
import { fetchEbayInventorySkus } from "@/lib/connectors/ebay";
import { fetchOttoSkus } from "@/lib/connectors/otto";
import { fetchMediaMarktSkus } from "@/lib/connectors/mediamarkt";
import { fetchKauflandSkus } from "@/lib/connectors/kaufland";
import { fetchShopifySkus } from "@/lib/connectors/shopify";
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
  const [mappings, orderEbaySkus, orderOutletSkus, orderOttoSkus, orderMediaMarktSkus, orderKauflandSkus, orderShopifySkus, apiEbaySkus, apiOutletSkus, apiOttoSkus, apiMediaMarktSkus, apiKauflandSkus, apiShopifySkus, allItems] = await Promise.all([
    prisma.skuMapping.findMany({
      orderBy: [{ marketplace: "asc" }, { marketplaceSku: "asc" }],
      include: {
        items: {
          include: { item: { select: { stock: true, stockNS: true, sku: true } } },
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
    prisma.orderItem.findMany({
      where: { order: { marketplace: "OTTO" } },
      select: { marketplaceSku: true, title: true },
      distinct: ["marketplaceSku"],
    }),
    prisma.orderItem.findMany({
      where: { order: { marketplace: "MEDIAMARKT" } },
      select: { marketplaceSku: true, title: true },
      distinct: ["marketplaceSku"],
    }),
    prisma.orderItem.findMany({
      where: { order: { marketplace: "KAUFLAND" } },
      select: { marketplaceSku: true, title: true },
      distinct: ["marketplaceSku"],
    }),
    prisma.orderItem.findMany({
      where: { order: { marketplace: "SHOPIFY" } },
      select: { marketplaceSku: true, title: true },
      distinct: ["marketplaceSku"],
    }),
    fetchEbayInventorySkus("main").catch(() => []),
    fetchEbayInventorySkus("outlet").catch((e) => { console.error("eBay Outlet API Fehler:", e.message); return []; }),
    fetchOttoSkus().catch((e) => { console.error("Otto API Fehler:", e.message); return []; }),
    fetchMediaMarktSkus().catch((e) => { console.error("MediaMarkt API Fehler:", e.message); return []; }),
    fetchKauflandSkus().catch((e) => { console.error("Kaufland API Fehler:", e.message); return []; }),
    fetchShopifySkus().catch((e) => { console.error("Shopify API Fehler:", e.message); return []; }),
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

  // Für Otto: API liefert alle SKUs inkl. inaktive.
  // Nur API-SKUs zeigen, die in Bestellungen vorkommen ODER Varianten eines Bestellungs-SKUs sind (Präfix-Match).
  const orderOttoSkuSet = new Set(orderOttoSkus.map((s) => s.marketplaceSku));
  const mappedOttoSkuSet = new Set(mappings.filter((m) => m.marketplace === "OTTO").map((m) => m.marketplaceSku));
  const filteredApiOttoSkus = apiOttoSkus.filter((s) => {
    if (orderOttoSkuSet.has(s.marketplaceSku)) return true;
    if (mappedOttoSkuSet.has(s.marketplaceSku)) return true;
    return orderOttoSkus.some((o) => s.marketplaceSku.startsWith(o.marketplaceSku + "/"));
  });
  const ottoSkus = mergeSkus(filteredApiOttoSkus, orderOttoSkus);
  const mediamarktSkus = mergeSkus(apiMediaMarktSkus, orderMediaMarktSkus);
  const kauflandSkus = mergeSkus(apiKauflandSkus, orderKauflandSkus);
  const shopifySkus = mergeSkus(apiShopifySkus, orderShopifySkus);

  // Pre-compute suggestions for unmapped SKUs
  const mappingSet = new Set(mappings.map((m) => `${m.marketplace}:${m.marketplaceSku}`));

  const suggestions: Record<string, string> = {};
  for (const [mp, skuList] of [["EBAY", ebaySkus], ["EBAY_OUTLET", ebayOutletSkus], ["OTTO", ottoSkus], ["MEDIAMARKT", mediamarktSkus], ["KAUFLAND", kauflandSkus], ["SHOPIFY", shopifySkus]] as const) {
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
      <div className="flex items-center gap-4 mb-6">
        <a href="/" className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Lager
        </a>
        <h1 className="text-2xl font-bold text-gray-900">Portale Bestand Sync</h1>
      </div>
      <SyncClient
        mappings={mappings}
        ebaySkus={ebaySkus}
        ebayOutletSkus={ebayOutletSkus}
        ottoSkus={ottoSkus}
        mediamarktSkus={mediamarktSkus}
        kauflandSkus={kauflandSkus}
        shopifySkus={shopifySkus}
        suggestions={suggestions}
      />
    </div>
  );
}
