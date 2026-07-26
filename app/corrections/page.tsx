import { createCorrection } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Field, Panel, SelectField, SubmitButton } from "@/components/ui";
import { StockImport } from "@/components/stock-import";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const inputClass = "h-8 rounded-lg border border-grey-border bg-white px-2 font-mono text-xs text-grey-dark focus:border-brand-red focus:outline-none";

export default async function CorrectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; bis?: string; austausch?: string; grund?: string }>;
}) {
  const { von, bis, austausch: austauschFilter, grund: grundFilter } = await searchParams;
  const hasFilter = !!(von || bis || austauschFilter || grundFilter);

  const [items, corrections] = await Promise.all([
    prisma.item.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.correction.findMany({
      take: hasFilter ? 500 : 30,
      orderBy: { date: "desc" },
      where: {
        ...(von || bis ? {
          date: {
            ...(von ? { gte: new Date(`${von}T00:00:00`) } : {}),
            ...(bis ? { lte: new Date(`${bis}T23:59:59`) } : {}),
          },
        } : {}),
        ...(austauschFilter === "ja" ? { austausch: true } : {}),
        ...(austauschFilter === "nein" ? { austausch: false } : {}),
        ...(grundFilter ? { reason: { contains: grundFilter, mode: "insensitive" } } : {}),
      },
      include: { user: true },
    }),
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
        <form action={createCorrection} className="grid gap-4 md:grid-cols-7">
          <Field label="Datum" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          <SelectField label="SKU" name="sku">{items.map((i) => <option key={i.sku} value={i.sku}>{i.sku}</option>)}</SelectField>
          <SelectField label="Lager" name="lager">
            <option value="neuware">Neuware-Lager</option>
            <option value="ns">NS-Lager</option>
          </SelectField>
          <Field label="Menge" name="quantity" type="number" defaultValue={-1} />
          <Field label="Grund" name="reason" placeholder="Inventur, Bruch ..." />
          <SelectField label="Austausch" name="austausch">
            <option value="nein">Nein</option>
            <option value="ja">Ja</option>
          </SelectField>
          <div className="flex items-end"><SubmitButton>Korrektur speichern</SubmitButton></div>
        </form>
      </Panel>
      <Panel className="overflow-x-auto">
        <div className="flex flex-wrap items-center gap-3 border-b border-grey-border px-5 py-4">
          <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">
            {hasFilter ? "Korrekturen (gefiltert)" : "Letzte Korrekturen"}
          </div>
          <form method="GET" className="ml-auto flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Von</span>
              <input type="date" name="von" defaultValue={von ?? ""} className={inputClass} />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Bis</span>
              <input type="date" name="bis" defaultValue={bis ?? ""} className={inputClass} />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Austausch</span>
              <select name="austausch" defaultValue={austauschFilter ?? ""} className={inputClass}>
                <option value="">Alle</option>
                <option value="ja">Ja</option>
                <option value="nein">Nein</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Grund</span>
              <input
                type="text"
                name="grund"
                defaultValue={grundFilter ?? ""}
                placeholder="Retoure, Storno …"
                className={`${inputClass} w-36`}
              />
            </label>
            <button type="submit" className="h-8 rounded-lg bg-brand-red px-3 font-mono text-xs font-semibold text-white hover:bg-brand-red-dark">
              Anzeigen
            </button>
            {hasFilter && (
              <a
                href="/corrections"
                className="h-8 inline-flex items-center rounded-lg border border-grey-border bg-white px-3 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors"
              >
                Zurücksetzen
              </a>
            )}
            {corrections.length > 0 && (
              <span className="font-mono text-xs text-grey-mid">{corrections.length} Einträge</span>
            )}
          </form>
        </div>
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead><tr className="border-b border-grey-border bg-grey-light">
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Datum</th>
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">SKU</th>
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Menge</th>
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Lager</th>
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Grund</th>
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Austausch</th>
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Austausch angekommen</th>
            <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Benutzer</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-grey-border">
            {corrections.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-grey-light/60">
                <td className="px-4 py-3 font-mono text-xs text-grey-mid">{formatDate(c.date)}</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-red">{c.sku}</td>
                <td className={`px-4 py-3 font-mono tabular-nums font-semibold ${c.quantity > 0 ? "text-green-700" : "text-brand-red"}`}>
                  {c.quantity > 0 ? "+" : ""}{c.quantity}
                </td>
                <td className="px-4 py-3">
                  {c.lager === "ns" ? (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-blue-700">NS-Lager</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-grey-light px-2.5 py-0.5 font-mono text-xs font-semibold text-grey-mid">Neuware</span>
                  )}
                </td>
                <td className="px-4 py-3 text-grey-dark">{c.reason}</td>
                <td className="px-4 py-3">
                  {c.austausch && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-amber-700">Ja</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.austauschAngekommen && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-green-700">Ja</span>
                  )}
                </td>
                <td className="px-4 py-3 text-grey-mid">{c.user.name}</td>
                <td className="px-4 py-3">
                  <a
                    href={`/corrections/${c.id}`}
                    className="inline-flex items-center rounded border border-grey-border bg-white px-2.5 py-1 font-mono text-[10px] font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors"
                  >
                    Bearbeiten
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {corrections.length === 0 && <div className="p-8 text-center font-mono text-xs text-grey-mid">Keine Korrekturen gefunden.</div>}
      </Panel>
    </AppShell>
  );
}
