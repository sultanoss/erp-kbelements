"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-utils";
import { pushEbayStock } from "@/lib/connectors/ebay";
import { revalidatePath } from "next/cache";

const SUPPORTED_MARKETPLACES = ["EBAY", "EBAY_OUTLET", "OTTO", "SHOPIFY", "KAUFLAND", "MEDIAMARKT"] as const;
export type SupportedMarketplace = typeof SUPPORTED_MARKETPLACES[number];

export type SyncResult = {
  marketplace: string;
  ok: number;
  error: number;
  errors: { sku: string; message: string }[];
  skipped?: string;
};

export async function saveSkuMapping(formData: FormData) {
  await requireUser();
  const marketplace = formData.get("marketplace") as string;
  const marketplaceSku = (formData.get("marketplaceSku") as string).trim();
  const label = (formData.get("label") as string | null)?.trim() || null;
  const internalSkus = (formData.get("internalSkus") as string).split(",").map((s) => s.trim()).filter(Boolean);

  if (!marketplace || !marketplaceSku || internalSkus.length === 0) {
    throw new Error("Fehlende Pflichtfelder");
  }

  await prisma.skuMapping.upsert({
    where: { marketplace_marketplaceSku: { marketplace, marketplaceSku } },
    create: {
      marketplace,
      marketplaceSku,
      label,
      items: { create: internalSkus.map((sku) => ({ internalSku: sku })) },
    },
    update: {
      label,
      active: true,
      items: {
        deleteMany: {},
        create: internalSkus.map((sku) => ({ internalSku: sku })),
      },
    },
  });

  revalidatePath("/lager/portale-bestand-sync");
}

export async function deleteSkuMapping(id: string) {
  await requireUser();
  await prisma.skuMapping.delete({ where: { id } });
  revalidatePath("/lager/portale-bestand-sync");
}

export async function toggleSkuMappingActive(id: string, active: boolean) {
  await requireUser();
  await prisma.skuMapping.update({ where: { id }, data: { active } });
  revalidatePath("/lager/portale-bestand-sync");
}

export async function syncStock(marketplaces: string[]): Promise<SyncResult[]> {
  await requireUser();
  const results: SyncResult[] = [];

  for (const mp of marketplaces) {
    const mappings = await prisma.skuMapping.findMany({
      where: { marketplace: mp, active: true },
      include: { items: { include: { item: { select: { stock: true, sku: true } } } } },
    });

    if (mappings.length === 0) {
      results.push({ marketplace: mp, ok: 0, error: 0, errors: [], skipped: "Keine aktiven Mappings" });
      continue;
    }

    // Calculate quantity = min of all internal SKU stocks
    const pushItems = mappings.map((m) => ({
      marketplaceSku: m.marketplaceSku,
      quantity: Math.min(...m.items.map((i) => i.item.stock)),
    }));

    if (mp === "EBAY" || mp === "EBAY_OUTLET") {
      try {
        const account = mp === "EBAY_OUTLET" ? "outlet" : "main";
        const res = await pushEbayStock(pushItems, account);
        const okItems = res.filter((r) => r.ok);
        const errItems = res.filter((r) => !r.ok);
        results.push({
          marketplace: mp,
          ok: okItems.length,
          error: errItems.length,
          errors: errItems.map((r) => ({ sku: r.marketplaceSku, message: r.error ?? "Unbekannter Fehler" })),
        });
      } catch (e) {
        results.push({
          marketplace: mp,
          ok: 0,
          error: pushItems.length,
          errors: [{ sku: "–", message: (e as Error).message }],
        });
      }
      continue;
    }

    // Other marketplaces: not yet implemented
    results.push({ marketplace: mp, ok: 0, error: 0, errors: [], skipped: "Noch nicht implementiert" });
  }

  return results;
}
