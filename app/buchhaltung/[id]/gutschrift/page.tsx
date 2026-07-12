import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { InvoiceForm, type InvoiceInitialData } from "@/components/invoice-form";

export const dynamic = "force-dynamic";

let _nextId = 200000;
let _nextSkuId = 200000;

const today = new Date().toISOString().slice(0, 10);

export default async function GutschriftErstellenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { pos: "asc" }, include: { skus: true } } },
  });

  if (!inv || inv.docType !== "rechnung") notFound();

  const allItems = await prisma.item.findMany({
    orderBy: { sku: "asc" },
    select: { sku: true, name: true, stock: true, stockNS: true },
  });

  const initialData: InvoiceInitialData = {
    date: today,
    customerName: inv.customerName,
    customerAddress: inv.customerAddress ?? "",
    customerNum: inv.customerNum ?? "",
    mwstRate: inv.mwstRate,
    shippingCost: inv.shippingCost != null ? String(inv.shippingCost) : "",
    shippingMwst: inv.shippingMwst ?? 19,
    paymentMethod: "konto",
    paymentInfo: "",
    notes: inv.notes ?? "",
    items: inv.items.map((it) => ({
      id: _nextId++,
      pos: it.pos,
      quantity: it.quantity,
      description: it.description,
      unitPrice: it.unitPrice,
      skus: it.skus.length > 0
        ? it.skus.map((s) => ({ id: _nextSkuId++, sku: s.sku, lager: s.lager }))
        : [{ id: _nextSkuId++, sku: "", lager: "neuware" }],
    })),
  };

  return (
    <AppShell>
      <PageHeader title={`Gutschrift zu ${inv.number}`} eyebrow="Gutschrift erstellen" />
      <div className="mb-4 rounded-lg border border-grey-border bg-grey-light px-4 py-3 font-mono text-sm text-grey-mid">
        Bezug: <span className="font-semibold text-grey-dark">{inv.number}</span> — {inv.customerName}
      </div>
      <div className="mb-5 max-w-4xl">
        <InvoiceForm
          skus={allItems}
          initialData={initialData}
          docType="gutschrift"
          originalInvoiceId={inv.id}
          originalInvoiceNum={inv.number}
        />
      </div>
    </AppShell>
  );
}
