import { createReceipt } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Field, Panel, SelectField, SubmitButton } from "@/components/ui";
import { ReceiptExcelImport } from "@/components/receipt-excel-import";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  const [items, receipts] = await Promise.all([
    prisma.item.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.receipt.findMany({ take: 30, orderBy: { createdAt: "desc" }, include: { user: true } }),
  ]);

  return (
    <AppShell>
      <PageHeader title="Wareneingang" eyebrow="Bestand wird automatisch erhöht" />

      {/* Excel-Import */}
      <Panel className="mb-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">
            Wareneingang per Excel importieren
          </span>
          <a
            href="/api/template?type=receipts"
            className="inline-flex items-center gap-1.5 rounded-lg border border-grey-border bg-grey-light px-3 py-1.5 font-mono text-xs font-semibold text-grey-dark hover:bg-grey-border transition-colors"
          >
            ↓ Template herunterladen
          </a>
        </div>
        <ReceiptExcelImport />
      </Panel>

      {/* Manueller Einzeleintrag */}
      <Panel className="mb-6 p-5">
        <div className="mb-4 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Neuen Wareneingang eintragen</div>
        <form action={createReceipt} className="grid gap-4 md:grid-cols-4">
          <Field label="Datum" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          <SelectField label="SKU" name="sku">{items.map((i) => <option key={i.sku} value={i.sku}>{i.sku}</option>)}</SelectField>
          <Field label="Menge" name="quantity" type="number" defaultValue={1} />
          <div className="flex items-end"><SubmitButton>Wareneingang speichern</SubmitButton></div>
        </form>
      </Panel>

      {/* Tabelle */}
      <Panel className="overflow-x-auto">
        <div className="flex items-center gap-3 border-b border-grey-border px-5 py-4">
          <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Letzte Wareneingänge</div>
        </div>
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead><tr className="border-b border-grey-border bg-grey-light">
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Datum</th>
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">SKU</th>
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Menge</th>
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Benutzer</th>
          </tr></thead>
          <tbody className="divide-y divide-grey-border">
            {receipts.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-grey-light/60">
                <td className="px-4 py-3 font-mono text-xs text-grey-mid">{formatDate(r.date)}</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-red">{r.sku}</td>
                <td className="px-4 py-3 font-mono tabular-nums font-semibold text-green-700">+{r.quantity}</td>
                <td className="px-4 py-3 text-grey-mid">{r.user.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {receipts.length === 0 && <div className="p-8 text-center font-mono text-xs text-grey-mid">Noch keine Wareneingänge.</div>}
      </Panel>
    </AppShell>
  );
}
