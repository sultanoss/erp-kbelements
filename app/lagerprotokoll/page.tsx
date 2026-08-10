import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import type { ActivityType } from "@prisma/client";

export const dynamic = "force-dynamic";

const typeBadge: Record<string, string> = {
  SHIPMENT:   "text-blue-700 border-blue-200 bg-blue-50",
  SALE:       "text-brand-red border-brand-red/20 bg-brand-red/5",
  RECEIPT:    "text-green-700 border-green-200 bg-green-50",
  CORRECTION: "text-purple-700 border-purple-200 bg-purple-50",
  STORNO:     "text-orange-700 border-orange-200 bg-orange-50",
  INVOICE:    "text-sky-700 border-sky-200 bg-sky-50",
};

const typeLabel: Record<string, string> = {
  SHIPMENT:   "Versand Online",
  SALE:       "Lager Verkauf",
  RECEIPT:    "Wareneingang",
  CORRECTION: "Korrektur",
  STORNO:     "Storno",
  INVOICE:    "Rechnung",
};

const ALL_TYPES: ActivityType[] = ["SHIPMENT", "SALE", "RECEIPT", "CORRECTION", "STORNO", "INVOICE"];

const FILTER_BUTTONS = [
  { label: "Alle",           typ: undefined },
  { label: "Versand Online", typ: "SHIPMENT" },
  { label: "Lager Verkauf",  typ: "SALE" },
  { label: "Wareneingang",   typ: "RECEIPT" },
  { label: "Korrekturen",    typ: "CORRECTION" },
  { label: "Storno",         typ: "STORNO" },
  { label: "Rechnung",       typ: "INVOICE" },
];

export default async function LagerprotokollPage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; bis?: string; sku?: string; typ?: string }>;
}) {
  const { von, bis, sku, typ } = await searchParams;

  const logs = await prisma.activityLog.findMany({
    take: 500,
    orderBy: { createdAt: "desc" },
    include: { user: true },
    where: {
      type: typ ? { equals: typ as ActivityType } : { in: ALL_TYPES },
      ...(von || bis
        ? {
            createdAt: {
              ...(von ? { gte: new Date(`${von}T00:00:00`) } : {}),
              ...(bis ? { lte: new Date(`${bis}T23:59:59`) } : {}),
            },
          }
        : {}),
      ...(sku ? { sku: { contains: sku, mode: "insensitive" } } : {}),
    },
  });

  const inputClass =
    "h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10";
  const labelClass =
    "font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid";
  const hasFilter = !!(von || bis || sku || typ);

  function filterLink(newTyp?: string) {
    const p = new URLSearchParams();
    if (von) p.set("von", von);
    if (bis) p.set("bis", bis);
    if (sku) p.set("sku", sku);
    if (newTyp) p.set("typ", newTyp);
    const qs = p.toString();
    return `/lagerprotokoll${qs ? `?${qs}` : ""}`;
  }

  return (
    <AppShell>
      <PageHeader title="Lagerprotokoll" eyebrow="Alle Lagerbewegungen" />

      {/* Filter */}
      <form method="GET" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5">
          <span className={labelClass}>SKU</span>
          <input
            name="sku"
            type="search"
            defaultValue={sku ?? ""}
            placeholder="SKU suchen …"
            className={`${inputClass} w-48`}
          />
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Von</span>
          <input name="von" type="date" defaultValue={von ?? ""} className={inputClass} />
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Bis</span>
          <input name="bis" type="date" defaultValue={bis ?? ""} className={inputClass} />
        </label>
        {typ && <input type="hidden" name="typ" value={typ} />}
        <button
          type="submit"
          className="h-10 rounded-lg bg-brand-red px-4 text-sm font-semibold text-white hover:bg-brand-red-dark"
        >
          Anzeigen
        </button>
        {hasFilter && (
          <a
            href="/lagerprotokoll"
            className="h-10 inline-flex items-center rounded-lg border border-grey-border bg-white px-4 font-mono text-sm font-semibold text-grey-dark transition-colors hover:border-brand-red hover:text-brand-red"
          >
            Zurücksetzen
          </a>
        )}
        <span className="ml-2 self-end pb-2 font-mono text-xs text-grey-mid">
          {logs.length} Einträge
        </span>
      </form>

      {/* Typ-Filter Buttons */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {FILTER_BUTTONS.map((btn) => {
          const isActive = (btn.typ ?? "") === (typ ?? "");
          return (
            <a
              key={btn.label}
              href={filterLink(btn.typ)}
              className={`rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold transition-colors ${
                isActive
                  ? "border-brand-red bg-brand-red text-white"
                  : "border-grey-border bg-white text-grey-mid hover:text-grey-dark"
              }`}
            >
              {btn.label}
            </a>
          );
        })}
      </div>

      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-grey-border bg-grey-light">
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Datum</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Typ</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">SKU</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Vorher</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Nachher</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Änderung</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Benutzer</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Notiz</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-border">
            {logs.map((log) => {
              const delta =
                log.oldStock != null && log.newStock != null
                  ? log.newStock - log.oldStock
                  : null;
              return (
                <tr key={log.id} className="transition-colors hover:bg-grey-light/60">
                  <td className="px-4 py-3 font-mono text-xs text-grey-mid whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                        typeBadge[log.type] ?? "text-grey-mid border-grey-border bg-grey-light"
                      }`}
                    >
                      {typeLabel[log.type] ?? log.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-red">
                    {log.sku ?? <span className="text-grey-mid">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-grey-mid">
                    {log.oldStock ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-grey-mid">
                    {log.newStock ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums font-semibold">
                    {delta != null ? (
                      <span className={delta >= 0 ? "text-green-700" : "text-brand-red"}>
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    ) : (
                      <span className="text-grey-mid">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-grey-dark">{log.user.name}</td>
                  <td className="px-4 py-3 text-grey-mid text-xs">{log.note ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="p-8 text-center font-mono text-xs text-grey-mid">
            Keine Einträge gefunden.
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
