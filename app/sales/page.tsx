import { createSale, createNSSale } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Field, Panel, SelectField, SubmitButton } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const today = new Date().toISOString().slice(0, 10);

export default async function SalesPage() {
  const items = await prisma.item.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <AppShell>
      <PageHeader title="Verkäufe" eyebrow="Bestand wird automatisch reduziert" />

      {/* Neuware-Lager Verkauf */}
      <Panel className="mb-6 p-5">
        <div className="mb-4 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">
          Neuware-Lager Verkauf
        </div>
        <form action={createSale} className="space-y-4">
          <input type="hidden" name="marketplace" value="DIREKT" />
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Datum" name="date" type="date" defaultValue={today} />
            <SelectField label="SKU" name="sku">
              {items.map((i) => <option key={i.sku} value={i.sku}>{i.sku} (Bestand: {i.stock})</option>)}
            </SelectField>
            <Field label="Menge" name="quantity" type="number" defaultValue={1} />
            <div className="flex items-end"><SubmitButton>Speichern</SubmitButton></div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <input type="checkbox" id="herdset-neuware" name="isHerdset" className="peer h-4 w-4 accent-brand-red" />
            <label htmlFor="herdset-neuware" className="text-sm font-semibold cursor-pointer select-none text-grey-dark">
              Ist ein Herdset
            </label>
            <input
              type="text"
              name="herdsetLabel"
              placeholder="Herdset-Label (z.B. BUNDLE-SET-001)"
              className="hidden peer-checked:block h-9 w-56 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
            />
          </div>
        </form>
      </Panel>

      {/* NS-Lager Verkauf */}
      <Panel className="mb-6 p-5">
        <div className="mb-4 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">
          NS-Lager Verkauf
        </div>
        <form action={createNSSale} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Datum" name="date" type="date" defaultValue={today} />
            <SelectField label="SKU" name="sku">
              {items.map((i) => <option key={i.sku} value={i.sku}>{i.sku} (NS: {i.stockNS})</option>)}
            </SelectField>
            <Field label="Menge" name="quantity" type="number" defaultValue={1} />
            <div className="flex items-end"><SubmitButton>Speichern</SubmitButton></div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <input type="checkbox" id="herdset-ns" name="isHerdset" className="peer h-4 w-4 accent-brand-red" />
            <label htmlFor="herdset-ns" className="text-sm font-semibold cursor-pointer select-none text-grey-dark">
              Ist ein Herdset
            </label>
            <input
              type="text"
              name="herdsetLabel"
              placeholder="Herdset-Label (z.B. BUNDLE-SET-001)"
              className="hidden peer-checked:block h-9 w-56 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
            />
          </div>
        </form>
      </Panel>
    </AppShell>
  );
}
