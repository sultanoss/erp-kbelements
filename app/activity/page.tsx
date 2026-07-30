import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatDate } from "@/lib/format";
import { ActivityType } from "@prisma/client";
import { setAustauschAngekommen } from "@/app/actions";

export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = {
  SALE: "Verkauf",
  RECEIPT: "Wareneingang",
  CORRECTION: "Korrektur",
  USER_CHANGE: "Benutzeränderung",
};

const typeBadge: Record<string, string> = {
  SALE: "text-brand-red border-brand-red/20 bg-brand-red/5",
  RECEIPT: "text-green-700 border-green-200 bg-green-50",
  CORRECTION: "text-orange-700 border-orange-200 bg-orange-50",
  USER_CHANGE: "text-grey-mid border-grey-border bg-grey-light",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; bis?: string; type?: string; austausch?: string }>;
}) {
  const { von, bis, type: typeFilter, austausch: austauschFilter } = await searchParams;
  const isAustauschView = austauschFilter === "ja";

  const [logs, corrections] = await Promise.all([
    isAustauschView
      ? Promise.resolve([])
      : prisma.activityLog.findMany({
          take: 200,
          orderBy: { createdAt: "desc" },
          include: { user: true },
          where: {
            ...(typeFilter ? { type: typeFilter as ActivityType } : {}),
            ...(von || bis
              ? {
                  createdAt: {
                    ...(von ? { gte: new Date(`${von}T00:00:00`) } : {}),
                    ...(bis ? { lte: new Date(`${bis}T23:59:59`) } : {}),
                  },
                }
              : {}),
          },
        }),
    isAustauschView
      ? prisma.correction.findMany({
          take: 500,
          orderBy: { date: "desc" },
          where: {
            austausch: true,
            ...(von || bis
              ? {
                  date: {
                    ...(von ? { gte: new Date(`${von}T00:00:00`) } : {}),
                    ...(bis ? { lte: new Date(`${bis}T23:59:59`) } : {}),
                  },
                }
              : {}),
          },
          include: { user: true },
        })
      : Promise.resolve([]),
  ]);

  const inputClass = "h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10";
  const labelClass = "font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid";
  const hasFilter = !!(typeFilter || von || bis || austauschFilter);

  return (
    <AppShell>
      <PageHeader title="Aktivitätsprotokoll" eyebrow="Jede wichtige Änderung" />

      <form method="GET" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5">
          <span className={labelClass}>Von</span>
          <input name="von" type="date" defaultValue={von ?? ""} className={inputClass} />
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Bis</span>
          <input name="bis" type="date" defaultValue={bis ?? ""} className={inputClass} />
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Typ</span>
          <select name="type" defaultValue={typeFilter ?? ""} className={inputClass}>
            <option value="">Alle</option>
            <option value="SALE">Verkauf</option>
            <option value="RECEIPT">Wareneingang</option>
            <option value="CORRECTION">Korrektur</option>
            <option value="USER_CHANGE">Benutzeränderung</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Austausch</span>
          <select name="austausch" defaultValue={austauschFilter ?? ""} className={inputClass}>
            <option value="">Alle</option>
            <option value="ja">Nur Austausch</option>
          </select>
        </label>
        <button
          type="submit"
          className="h-10 rounded-lg bg-brand-red px-4 text-sm font-semibold text-white hover:bg-brand-red-dark"
        >
          Anzeigen
        </button>
        {hasFilter && (
          <a
            href="/activity"
            className="h-10 inline-flex items-center rounded-lg border border-grey-border bg-white px-4 font-mono text-sm font-semibold text-grey-dark transition-colors hover:border-brand-red hover:text-brand-red"
          >
            Zurücksetzen
          </a>
        )}
        <a
          href={`/activity/export?${new URLSearchParams({
            ...(von ? { von } : {}),
            ...(bis ? { bis } : {}),
            ...(typeFilter ? { type: typeFilter } : {}),
          }).toString()}`}
          className="h-10 inline-flex items-center rounded-lg border border-grey-border bg-white px-4 font-mono text-sm font-semibold text-grey-dark transition-colors hover:border-brand-red hover:text-brand-red"
        >
          ↓ Excel
        </a>
        <span className="ml-2 self-end pb-2 font-mono text-xs text-grey-mid">
          {logs.length} Einträge
        </span>
      </form>

      {isAustauschView ? (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-grey-border bg-grey-light">
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Datum</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">SKU</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Menge</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Grund</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Benutzer</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Angekommen</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-border">
              {corrections.map((c) => (
                <tr key={c.id} className={`transition-colors hover:bg-grey-light/60 ${c.austauschAngekommen ? "bg-green-50/40" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs text-grey-mid">{formatDate(c.date)}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-red">{c.sku}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-grey-mid">{c.quantity > 0 ? `+${c.quantity}` : c.quantity}</td>
                  <td className="px-4 py-3 text-grey-dark">{c.reason}</td>
                  <td className="px-4 py-3 text-grey-dark">{c.user.name}</td>
                  <td className="px-4 py-3">
                    <form action={setAustauschAngekommen}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="angekommen" value={c.austauschAngekommen ? "nein" : "ja"} />
                      <button
                        type="submit"
                        className={`rounded-full border px-3 py-0.5 font-mono text-xs font-semibold transition-colors ${
                          c.austauschAngekommen
                            ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                            : "border-grey-border text-grey-mid hover:border-brand-red hover:text-brand-red"
                        }`}
                      >
                        {c.austauschAngekommen ? "Ja" : "—"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/corrections/${c.id}`}
                      className="rounded border border-grey-border px-3 py-0.5 font-mono text-xs font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors"
                    >
                      Bearbeiten
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {corrections.length === 0 && <div className="p-8 text-center font-mono text-xs text-grey-mid">Keine Austausch-Korrekturen gefunden.</div>}
        </Panel>
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-grey-border bg-grey-light">
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Zeit</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Typ</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">SKU</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Alt</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Neu</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Benutzer</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Notiz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-border">
              {logs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-grey-light/60">
                  <td className="px-4 py-3 font-mono text-xs text-grey-mid">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-semibold ${typeBadge[log.type] ?? typeBadge.USER_CHANGE}`}>
                      {typeLabel[log.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-red">{log.sku ?? "—"}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-grey-mid">{log.oldStock ?? "—"}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-grey-mid">{log.newStock ?? "—"}</td>
                  <td className="px-4 py-3 text-grey-dark">{log.user.name}</td>
                  <td className="px-4 py-3 text-grey-mid">{log.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <div className="p-8 text-center font-mono text-xs text-grey-mid">Keine Einträge gefunden.</div>}
        </Panel>
      )}
    </AppShell>
  );
}
