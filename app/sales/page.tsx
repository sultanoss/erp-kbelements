import { createSale, createNSSale } from "@/app/actions";
import { CsvImport } from "@/components/csv-import";
import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Field, Panel, SelectField, SubmitButton } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { HaendlerImport } from "@/components/haendler-import";

export const dynamic = "force-dynamic";

const today = new Date().toISOString().slice(0, 10);

export default async function SalesPage() {
  const items = await prisma.item.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <AppShell>
      <PageHeader title="Verkäufe" eyebrow="Bestand wird automatisch reduziert" />

      {/* Export-Buttons */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <form method="GET" action="/api/export/sales" className="flex items-center gap-2">
          <input
            name="date"
            type="date"
            defaultValue={today}
            className="h-8 rounded-lg border border-grey-border bg-white px-2 font-mono text-xs text-grey-dark focus:border-brand-red focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-grey-light px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:bg-grey-border transition-colors"
          >
            ↓ Tag exportieren
          </button>
        </form>
        <form method="GET" action="/api/export/sales-range" className="flex items-center gap-2">
          <input
            name="von"
            type="date"
            defaultValue={today}
            className="h-8 rounded-lg border border-grey-border bg-white px-2 font-mono text-xs text-grey-dark focus:border-brand-red focus:outline-none"
          />
          <span className="font-mono text-xs text-grey-mid">–</span>
          <input
            name="bis"
            type="date"
            defaultValue={today}
            className="h-8 rounded-lg border border-grey-border bg-white px-2 font-mono text-xs text-grey-dark focus:border-brand-red focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-grey-light px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:bg-grey-border transition-colors"
          >
            ↓ Zeitraum exportieren
          </button>
        </form>
        <a
          href="/api/template"
          className="inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-grey-light px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:bg-grey-border transition-colors"
        >
          ↓ Template
        </a>
      </div>

      {/* Tagesverkäufe importieren */}
      <Panel className="mb-6 p-5">
        <div className="mb-4 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">
          Tagesverkäufe importieren
        </div>
        <CsvImport />
      </Panel>

      {/* Händler Verkäufe */}
      <Panel className="mb-6 p-5">
        <div className="mb-4 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">
          Händler Verkäufe
        </div>
        <HaendlerImport />
      </Panel>

      {/* Lager Verkauf */}
      <Panel className="mb-6 p-5">
        <div className="mb-4 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">
          Neuware-Lager Verkauf
        </div>
        <form action={createSale} className="grid gap-4 md:grid-cols-4">
          <input type="hidden" name="marketplace" value="DIREKT" />
          <Field label="Datum" name="date" type="date" defaultValue={today} />
          <SelectField label="SKU" name="sku">
            {items.map((i) => <option key={i.sku} value={i.sku}>{i.sku} (Bestand: {i.stock})</option>)}
          </SelectField>
          <Field label="Menge" name="quantity" type="number" defaultValue={1} />
          <div className="flex items-end"><SubmitButton>Speichern</SubmitButton></div>
        </form>
      </Panel>

      {/* NS-Lager Verkauf */}
      <Panel className="mb-6 p-5">
        <div className="mb-4 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">
          NS-Lager Verkauf
        </div>
        <form action={createNSSale} className="grid gap-4 md:grid-cols-4">
          <Field label="Datum" name="date" type="date" defaultValue={today} />
          <SelectField label="SKU" name="sku">
            {items.map((i) => <option key={i.sku} value={i.sku}>{i.sku} (NS: {i.stockNS})</option>)}
          </SelectField>
          <Field label="Menge" name="quantity" type="number" defaultValue={1} />
          <div className="flex items-end"><SubmitButton>Speichern</SubmitButton></div>
        </form>
      </Panel>
    </AppShell>
  );
}
