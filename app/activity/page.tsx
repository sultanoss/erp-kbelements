import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

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

export default async function ActivityPage() {
  const logs = await prisma.activityLog.findMany({
    take: 80,
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  return (
    <AppShell>
      <PageHeader title="Aktivitätsprotokoll" eyebrow="Jede wichtige Änderung" />
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
        {logs.length === 0 && <div className="p-8 text-center font-mono text-xs text-grey-mid">Noch keine Aktivitäten.</div>}
      </Panel>
    </AppShell>
  );
}
