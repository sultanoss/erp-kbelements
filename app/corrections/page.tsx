import { createCorrection } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Field, Panel, SelectField, SubmitButton } from "@/components/ui";
import { StockImport } from "@/components/stock-import";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CorrectionsPage() {
  const [items, corrections] = await Promise.all([
    prisma.item.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.correction.findMany({ take: 30, orderBy: { createdAt: "desc" }, include: { user: true } }),
  ]);

  return (
    <AppShell>
      <PageHeader title="Korrekturen" eyebrow="Positive oder negative Menge" />
      <Panel className="mb-6 p-5">
        <div className="mb-4 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Bestand importieren</div>
        <StockImport />
      </Panel>
      <Panel className="mb-6 p-5">
        <div className="mb-4 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Korrektur eintragen</div>
        <form action={createCorrection} className="grid gap-4 md:grid-cols-5">
          <Field label="Datum" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          <SelectField label="SKU" name="sku">{items.map((i) => <option key={i.sku} value={i.sku}>{i.sku}</option>)}</SelectField>
          <Field label="Menge" name="quantity" type="number" defaultValue={-1} />
          <Field label="Grund" name="reason" placeholder="Inventur, Bruch ..." />
          <div className="flex items-end"><SubmitButton>Korrektur speichern</SubmitButton></div>
        </form>
      </Panel>
      <Panel className="overflow-x-auto">
        <div className="flex items-center gap-3 border-b border-grey-border px-5 py-4">
          <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Letzte Korrekturen</div>
        </div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead><tr className="border-b border-grey-border bg-grey-light">
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Datum</th>
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">SKU</th>
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Menge</th>
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Grund</th>
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Benutzer</th>
          </tr></thead>
          <tbody className="divide-y divide-grey-border">
            {corrections.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-grey-light/60">
                <td className="px-4 py-3 font-mono text-xs text-grey-mid">{formatDate(c.date)}</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-red">{c.sku}</td>
                <td className={`px-4 py-3 font-mono tabular-nums font-semibold ${c.quantity > 0 ? "text-green-700" : "text-brand-red"}`}>
                  {c.quantity > 0 ? "+" : ""}{c.quantity}
                </td>
                <td className="px-4 py-3 text-grey-dark">{c.reason}</td>
                <td className="px-4 py-3 text-grey-mid">{c.user.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {corrections.length === 0 && <div className="p-8 text-center font-mono text-xs text-grey-mid">Noch keine Korrekturen.</div>}
      </Panel>
    </AppShell>
  );
}
