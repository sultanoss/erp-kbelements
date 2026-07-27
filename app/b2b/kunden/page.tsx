import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { CustomerManager } from "./customer-form";
import { requireAdmin } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function KundenPage() {
  await requireAdmin();
  const customers = await prisma.b2bCustomer.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell>
      <PageHeader title="B2B Kunden" eyebrow="B2B" />
      <Panel className="p-5">
        <CustomerManager initialCustomers={customers} />
      </Panel>
    </AppShell>
  );
}
