import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { InvoiceForm } from "@/components/invoice-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NeueRechnungPage() {
  const items = await prisma.item.findMany({
    orderBy: { createdAt: "asc" },
    select: { sku: true, name: true, stock: true, stockNS: true },
  });

  return (
    <AppShell>
      <PageHeader title="Neue Rechnung" eyebrow="Buchhaltung" />
      <Panel className="p-6">
        <InvoiceForm skus={items} />
      </Panel>
    </AppShell>
  );
}
