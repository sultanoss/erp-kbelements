import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { InvoiceForm, type InvoiceInitialData } from "@/components/invoice-form";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

let _nextId = 200000;
let _nextSkuId = 200000;

export default async function AngebotBearbeitenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const angebot = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { pos: "asc" }, include: { skus: true } } },
  });

  if (!angebot || angebot.docType !== "angebot") notFound();

  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const [allItems, b2bCustomers, b2cCustomers] = await Promise.all([
    prisma.item.findMany({ orderBy: { sku: "asc" }, select: { sku: true, name: true, stock: true, stockNS: true, purchasePrice: true } }),
    prisma.b2bCustomer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, customerNum: true, phone: true, address: true, mwstRate: true, paymentMethod: true, paymentInfo: true, notes: true } }),
    prisma.b2cCustomer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, customerNum: true, phone: true, address: true } }),
  ]);

  const initialData: InvoiceInitialData = {
    invoiceId: angebot.id,
    date: angebot.date.toISOString().slice(0, 10),
    customerName: angebot.customerName,
    customerAddress: angebot.customerAddress ?? "",
    customerNum: angebot.customerNum ?? "",
    customerPhone: (angebot as { customerPhone?: string | null }).customerPhone ?? "",
    mwstRate: angebot.mwstRate,
    shippingCost: angebot.shippingCost != null ? String(angebot.shippingCost) : "",
    shippingMwst: angebot.shippingMwst ?? 19,
    paymentMethod: "konto",
    paymentInfo: "",
    notes: angebot.notes ?? "",
    customerType: (angebot.customerType as "b2c" | "b2b") ?? "b2c",
    items: angebot.items.map((it) => ({
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
      <PageHeader title={`${angebot.number} — Bearbeiten`} eyebrow="Angebot bearbeiten" />
      <div className="mb-5 max-w-4xl">
        <InvoiceForm
          skus={allItems}
          initialData={initialData}
          docType="angebot"
          b2bCustomers={b2bCustomers}
          b2cCustomers={b2cCustomers}
          isAdmin={isAdmin}
        />
      </div>
    </AppShell>
  );
}
