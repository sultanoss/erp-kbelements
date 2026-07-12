import { createReceipt, createNSReceipt } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Field, Panel, SelectField, SubmitButton } from "@/components/ui";
import { ReceiptExcelImport } from "@/components/receipt-excel-import";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; bis?: string }>;
}) {
  const { von, bis } = await searchParams;

  const [items, receipts] = await Promise.all([
    prisma.item.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.receipt.findMany({
      take: von || bis ? 500 : 30,
      orderBy: { date: "desc" },
      include: { user: true },
      where: {
        ...(von || bis
          ? {
              date: {
                ...(von ? { gte: new Date(`${von}T00:00:00`) } : {}),
                ...(bis ? { lte: new Date(`${bis}T23:59:59`) } : {}),
              },
            }
          : {}),
      },
    }),
  ]);

  const inputClass = "h-9 rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10";
  const hasFilter = !!(von || bis);

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

      {/* Neuware-Lager Wareneingang */}
      <Panel className="mb-6 p-5">
        <div className="mb-4 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Neuware-Lager — Wareneingang eintragen</div>
        <form action={createReceipt} className="grid gap-4 md:grid-cols-4">
          <Field label="Datum" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          <SelectField label="SKU" name="sku">{items.map((i) => <option key={i.sku} value={i.sku}>{i.sku}</option>)}</SelectField>
          <Field label="Menge" name="quantity" type="number" defaultValue={1} />
          <div className="flex items-end"><SubmitButton>Speichern</SubmitButton></div>
        </form>
      </Panel>

      {/* NS-Lager Wareneingang */}
      <Panel className="mb-6 p-5">
        <div className="mb-4 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">NS-Lager — Wareneingang eintragen</div>
        <form action={createNSReceipt} className="grid gap-4 md:grid-cols-4">
          <Field label="Datum" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          <SelectField label="SKU" name="sku">{items.map((i) => <option key={i.sku} value={i.sku}>{i.sku}</option>)}</SelectField>
          <Field label="Menge" name="quantity" type="number" defaultValue={1} />
          <div className="flex items-end"><SubmitButton>Speichern</SubmitButton></div>
        </form>
      </Panel>

      {/* Tabelle */}
      <Panel className="overflow-x-auto">
        <div className="flex flex-wrap items-center gap-3 border-b border-grey-border px-5 py-4">
          <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">
            Letzte Wareneingänge
          </div>
          <form method="GET" className="ml-auto flex flex-wrap items-center gap-2">
            <input name="von" type="date" defaultValue={von ?? ""} className={inputClass} />
            <input name="bis" type="date" defaultValue={bis ?? ""} className={inputClass} />
            <button
              type="submit"
              className="h-9 rounded-lg bg-brand-red px-3 text-sm font-semibold text-white hover:bg-brand-red-dark"
            >
              Anzeigen
            </button>
            {hasFilter && (
              <a
                href="/receipts"
                className="h-9 inline-flex items-center rounded-lg border border-grey-border bg-white px-3 font-mono text-sm font-semibold text-grey-dark transition-colors hover:border-brand-red hover:text-brand-red"
              >
                Zurücksetzen
              </a>
            )}
          </form>
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
        {receipts.length === 0 && <div className="p-8 text-center font-mono text-xs text-grey-mid">Keine Wareneingänge gefunden.</div>}
      </Panel>
    </AppShell>
  );
}
