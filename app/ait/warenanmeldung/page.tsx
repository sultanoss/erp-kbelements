import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { NeuerLieferscheinForm } from "./neuer-lieferschein-form";
import { MarkAsPickedUpButton, DeleteDeliveryNoteButton, ScanUploadButton, RevertPickedUpButton } from "./lieferschein-actions";

export const dynamic = "force-dynamic";

export default async function WarenanmeldungPage() {
  await requireUser();

  const [notes, items] = await Promise.all([
    prisma.aitDeliveryNote.findMany({
      orderBy: { createdAt: "desc" },
      include: { lines: true },
    }),
    prisma.item.findMany({ orderBy: { sku: "asc" }, select: { sku: true, name: true } }),
  ]);

  return (
    <AppShell>
      <PageHeader title="Warenanmeldung" eyebrow="AIT Spedition" />

      <div className="mb-6">
        <NeuerLieferscheinForm items={items} />
      </div>

      <Panel className="overflow-x-auto">
        {notes.length === 0 ? (
          <p className="px-4 py-8 text-center font-mono text-sm text-grey-mid">
            Noch keine Lieferscheine vorhanden.
          </p>
        ) : (
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-grey-border bg-grey-light">
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Nr.</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Abholdatum</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Artikel</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Gesamt</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Status</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-border">
              {notes.map((note) => {
                const totalQty = note.lines.reduce((s, l) => s + l.quantity, 0);
                const isPicked = note.status === "PICKED_UP";
                return (
                  <tr key={note.id} className="transition-colors hover:bg-grey-light/60">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-brand-red">{note.number}</td>
                    <td className="px-4 py-3 font-mono text-xs text-grey-dark">
                      {note.pickupDate.toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {note.lines.map((l) => (
                          <div key={l.id} className="font-mono text-xs text-grey-dark">
                            {l.quantity}× <span className="text-brand-red">{l.sku}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-sm font-semibold text-grey-dark">
                      {totalQty} Stück
                    </td>
                    <td className="px-4 py-3">
                      {isPicked ? (
                        <span className="inline-flex items-center gap-1.5 rounded border border-green-200 bg-green-50 px-2 py-1 font-mono text-xs font-semibold text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          Abgeholt
                          {note.pickedUpAt && (
                            <span className="font-normal text-green-600">
                              {" "}{note.pickedUpAt.toLocaleDateString("de-DE")}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded border border-yellow-200 bg-yellow-50 px-2 py-1 font-mono text-xs font-semibold text-yellow-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                          Offen
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/ait/warenanmeldung/${note.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded border border-grey-border px-2 py-1 font-mono text-[11px] text-grey-mid hover:border-brand-red hover:text-brand-red transition-colors"
                        >
                          PDF
                        </a>
                        {isPicked ? (
                          <RevertPickedUpButton id={note.id} />
                        ) : (
                          <>
                            <MarkAsPickedUpButton id={note.id} />
                            <DeleteDeliveryNoteButton id={note.id} />
                          </>
                        )}
                        <ScanUploadButton id={note.id} hasScan={!!note.signedScanData} />
                      </div>
                      {note.notes && (
                        <p className="mt-1 font-mono text-[11px] text-grey-mid">{note.notes}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </AppShell>
  );
}
