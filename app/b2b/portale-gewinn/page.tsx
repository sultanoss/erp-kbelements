import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { PortalGewinnClient } from "./portal-gewinn-client";

export const dynamic = "force-dynamic";

export default async function PortalGewinnPage() {
  const [items, setting] = await Promise.all([
    prisma.item.findMany({
      orderBy: { sku: "asc" },
      select: { sku: true, name: true, purchasePrice: true },
    }),
    prisma.setting.findUnique({ where: { key: "PORTAL_EXTRA_COSTS" } }),
  ]);

  const extraCosts: Record<string, number> = setting?.value
    ? (JSON.parse(setting.value) as Record<string, number>)
    : {};

  return (
    <AppShell>
      <PageHeader title="Portale Gewinn" eyebrow="B2B" />
      <PortalGewinnClient items={items} extraCosts={extraCosts} />
    </AppShell>
  );
}
