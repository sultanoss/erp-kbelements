import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { InvoiceForm } from "@/components/invoice-form";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function NeueGutschriftPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const [allItems, b2bCustomers, b2cCustomers] = await Promise.all([
    prisma.item.findMany({
      orderBy: { sku: "asc" },
      select: { sku: true, name: true, stock: true, stockNS: true, purchasePrice: true },
    }),
    prisma.b2bCustomer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, customerNum: true, phone: true, address: true, mwstRate: true, paymentMethod: true, paymentInfo: true, notes: true },
    }),
    prisma.b2cCustomer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, customerNum: true, phone: true, address: true },
    }),
  ]);

  return (
    <AppShell>
      <PageHeader title="Neue Gutschrift" eyebrow="Gutschrift erstellen" />
      <div className="mb-5 max-w-4xl">
        <InvoiceForm
          skus={allItems}
          docType="gutschrift"
          b2bCustomers={b2bCustomers}
          b2cCustomers={b2cCustomers}
          isAdmin={isAdmin}
        />
      </div>
    </AppShell>
  );
}
