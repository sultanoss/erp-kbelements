import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { InvoiceForm } from "@/components/invoice-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NeueRechnungPage() {
  const [items, b2bCustomers, b2cCustomers] = await Promise.all([
    prisma.item.findMany({
      orderBy: { createdAt: "asc" },
      select: { sku: true, name: true, stock: true, stockNS: true },
    }),
    prisma.b2bCustomer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, customerNum: true, address: true, mwstRate: true, paymentMethod: true, paymentInfo: true, notes: true },
    }),
    prisma.b2cCustomer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, customerNum: true, phone: true, address: true },
    }),
  ]);

  return (
    <AppShell>
      <PageHeader title="Neue Rechnung" eyebrow="Buchhaltung" />
      <Panel className="p-6">
        <InvoiceForm skus={items} b2bCustomers={b2bCustomers} b2cCustomers={b2cCustomers} />
      </Panel>
    </AppShell>
  );
}
