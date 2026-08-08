import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { InvoiceForm } from "@/components/invoice-form";
import { prisma } from "@/lib/prisma";
import { generateCustomerNum } from "@/lib/customer-helper";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function NeueRechnungPage({
  searchParams,
}: {
  searchParams: Promise<{ proforma?: string; busy?: string }>;
}) {
  const { proforma, busy } = await searchParams;
  const isProforma = proforma === "1";

  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const [items, b2bCustomers, b2cCustomers, defaultCustomerNum] = await Promise.all([
    prisma.item.findMany({
      orderBy: { createdAt: "asc" },
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
    generateCustomerNum(),
  ]);

  return (
    <AppShell>
      <PageHeader title={isProforma ? "Neue Proforma-Rechnung" : "Neue Rechnung"} eyebrow="Buchhaltung" />
      {busy === "1" && (
        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          Momentan wird automatisch eine Rechnung erstellt. Bitte versuche es in wenigen Sekunden erneut.
        </div>
      )}
      <Panel className="p-6">
        <InvoiceForm skus={items} b2bCustomers={b2bCustomers} b2cCustomers={b2cCustomers} docType={isProforma ? "proforma" : "rechnung"} defaultCustomerNum={defaultCustomerNum} isAdmin={isAdmin} />
      </Panel>
    </AppShell>
  );
}
