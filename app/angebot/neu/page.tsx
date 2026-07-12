import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { InvoiceForm } from "@/components/invoice-form";

export const dynamic = "force-dynamic";

export default async function NeuesAngebotPage() {
  const allItems = await prisma.item.findMany({
    orderBy: { sku: "asc" },
    select: { sku: true, name: true, stock: true, stockNS: true },
  });

  return (
    <AppShell>
      <PageHeader title="Neues Angebot" eyebrow="Angebot erstellen" />
      <div className="mb-5 max-w-4xl">
        <InvoiceForm skus={allItems} docType="angebot" />
      </div>
    </AppShell>
  );
}
