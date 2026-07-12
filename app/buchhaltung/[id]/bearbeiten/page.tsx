import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { InvoiceForm, type InvoiceInitialData } from "@/components/invoice-form";

export const dynamic = "force-dynamic";

let _nextId = 100000;
let _nextSkuId = 100000;

export default async function BearbeitenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { pos: "asc" }, include: { skus: true } } },
  });

  if (!inv) notFound();
  if (inv.status !== "aktiv") redirect(`/buchhaltung/${id}`);

  const allItems = await prisma.item.findMany({
    orderBy: { sku: "asc" },
    select: { sku: true, name: true, stock: true, stockNS: true },
  });

  const initialData: InvoiceInitialData = {
    invoiceId: inv.id,
    date: inv.date.toISOString().slice(0, 10),
    customerName: inv.customerName,
    customerAddress: inv.customerAddress ?? "",
    customerNum: inv.customerNum ?? "",
    mwstRate: inv.mwstRate,
    shippingCost: inv.shippingCost != null ? String(inv.shippingCost) : "",
    paymentMethod: inv.paymentMethod === "bar" ? "bar" : "konto",
    paymentInfo: inv.paymentInfo ?? "",
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
      <PageHeader title={`${inv.number} — Korrektur`} eyebrow="Rechnung bearbeiten" />
      <div className="mb-5 max-w-4xl">
        <InvoiceForm skus={allItems} initialData={initialData} />
      </div>
    </AppShell>
  );
}
