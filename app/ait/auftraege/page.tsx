import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { CopyButton } from "./copy-button";

export const dynamic = "force-dynamic";

export default async function AitAuftraegePage() {
  await requireUser();

  const shipments = await prisma.shipment.findMany({
    where: { carrier: "AIT" },
    orderBy: { createdAt: "desc" },
    include: {
      order: { select: { orderNumber: true, customerName: true, marketplace: true } },
    },
  });

  return (
    <AppShell>
      <PageHeader title="AIT Aufträge" eyebrow="AIT Spedition" />

      <Panel className="overflow-x-auto">
        {shipments.length === 0 ? (
          <p className="px-4 py-8 text-center font-mono text-sm text-grey-mid">
            Noch keine AIT-Aufträge vorhanden.
          </p>
        ) : (
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-grey-border bg-grey-light">
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Datum</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Bestellung</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Kunde</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Consignment-Nr.</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">SelfServiceId</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-border">
              {shipments.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-grey-light/60">
                  <td className="px-4 py-3 font-mono text-xs text-grey-mid">
                    {s.createdAt.toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/bestellungen/${s.orderId}`}
                      className="font-mono text-sm font-semibold text-brand-red hover:underline"
                    >
                      {s.order.orderNumber ?? s.orderId.slice(0, 8)}
                    </a>
                    <span className="ml-2 font-mono text-[10px] text-grey-mid">{s.order.marketplace}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-grey-dark">{s.order.customerName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-grey-dark">{s.aitConsignmentNo ?? "—"}</td>
                  <td className="px-4 py-3">
                    {s.aitSelfServiceId ? (
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs text-grey-dark">{s.aitSelfServiceId}</span>
                        <CopyButton text={s.aitSelfServiceId} />
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-grey-mid italic">Ausstehend</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded border border-blue-200 bg-blue-50 px-2 py-1 font-mono text-xs font-semibold text-blue-700">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </AppShell>
  );
}
