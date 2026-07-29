import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { PriceTable } from "./price-table";
import { requireAdmin } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function PreislistePage() {
  await requireAdmin();
  const [items, columns] = await Promise.all([
    prisma.item.findMany({
      select: {
        sku: true,
        name: true,
        purchasePrice: true,
        description: true,
        highlights: true,
        scopeOfDelivery: true,
        imageUrl: true,
        priceColumnValues: {
          select: { priceColumnId: true, price: true },
        },
      },
      orderBy: { sku: "asc" },
    }),
    prisma.priceColumn.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <AppShell>
      <PageHeader title="Preisliste" eyebrow="B2B" />
      <Panel className="overflow-hidden p-0">
        <PriceTable
          initialRows={items.map((item) => ({
            sku: item.sku,
            name: item.name,
            purchasePrice: item.purchasePrice,
            description: item.description,
            highlights: item.highlights,
            scopeOfDelivery: item.scopeOfDelivery,
            imageUrl: item.imageUrl,
            columnValues: item.priceColumnValues,
          }))}
          initialColumns={columns}
        />
      </Panel>
    </AppShell>
  );
}
