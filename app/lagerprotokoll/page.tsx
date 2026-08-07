import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const typeBadge: Record<string, string> = {
  SALE: "text-brand-red border-brand-red/20 bg-brand-red/5",
  RECEIPT: "text-green-700 border-green-200 bg-green-50",
};

const typeLabel: Record<string, string> = {
  SALE: "Lagerabzug",
  RECEIPT: "Wareneingang",
};

export default async function LagerprotokollPage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; bis?: string; sku?: string }>;
}) {
  const { von, bis, sku } = await searchParams;

  const logs = await prisma.activityLog.findMany({
    take: 500,
    orderBy: { createdAt: "desc" },
    include: { user: true },
    where: {
      type: { in: ["SALE", "RECEIPT"] },
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
  const hasFilter = !!(von || bis || sku);

  return (
    <AppShell>
      <PageHeader title="Lagerprotokoll" eyebrow="Abzüge und Wareneingänge" />

      <form method="GET" className="mb-6 flex flex-wrap items-end gap-3">
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
                        typeBadge[log.type] ?? ""
                      }`}
                    >
                      {typeLabel[log.type] ?? log.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-red">
                    {log.sku ?? "—"}
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
