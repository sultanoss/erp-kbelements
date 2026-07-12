import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { GutschriftForm } from "./gutschrift-form";

export const dynamic = "force-dynamic";

export default async function GutschriftErstellenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!inv || inv.docType !== "rechnung") notFound();

  const today = new Date().toISOString().slice(0, 10);
  const originalbetrag = inv.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0) + (inv.shippingCost ?? 0);

  return (
    <AppShell>
      <PageHeader title={`Gutschrift zu ${inv.number}`} eyebrow="Gutschrift erstellen" />
      <div className="mb-4">
        <Link
          href={`/buchhaltung/${id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-grey-light px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:bg-grey-border transition-colors"
        >
          ← Zurück zur Rechnung
        </Link>
      </div>
      <Panel className="max-w-2xl p-6">
        <GutschriftForm
          originalInvoiceId={inv.id}
          originalInvoiceNum={inv.number}
          customerName={inv.customerName}
          originalbetrag={originalbetrag}
          today={today}
        />
      </Panel>
    </AppShell>
  );
}
