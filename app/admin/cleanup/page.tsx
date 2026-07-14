import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { cleanupDuplicateSales } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function CleanupPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const { date } = await searchParams;
  const queryDate = date ?? "2026-07-13";

  // Alle Juli-Verkäufe nach exaktem Datums-Timestamp gruppiert
  const juliFrom = new Date("2026-07-01T00:00:00.000Z");
  const juliTo   = new Date("2026-07-31T23:59:59.999Z");

  const allJuliGroups = await prisma.sale.groupBy({
    by: ["date"],
    where: { date: { gte: juliFrom, lte: juliTo } },
    _sum: { quantity: true },
    _count: true,
    orderBy: { date: "asc" },
  });

  // Auch Monate davor/danach prüfen (falls Datum falsch gespeichert)
  const allSalesRecent = await prisma.sale.groupBy({
    by: ["date"],
    where: { date: { gte: new Date("2026-07-10T00:00:00.000Z"), lte: new Date("2026-07-16T23:59:59.999Z") } },
    _sum: { quantity: true },
    _count: true,
    orderBy: { date: "asc" },
  });

  // Für das gewählte Datum: Duplikate analysieren
  const from = new Date(`${queryDate}T00:00:00.000Z`);
  const to   = new Date(`${queryDate}T23:59:59.999Z`);

  const sales = await prisma.sale.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { createdAt: "asc" },
    select: { id: true, sku: true, marketplace: true, quantity: true, createdAt: true, date: true },
  });

  const groups = new Map<string, typeof sales>();
  for (const s of sales) {
    const key = `${s.sku}__${s.marketplace}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const totalQty = sales.reduce((s, r) => s + r.quantity, 0);
  const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);
  const duplicateCount = duplicateGroups.reduce((s, g) => s + g.length - 1, 0);

  const action = cleanupDuplicateSales.bind(null, queryDate);

  return (
    <AppShell>
      <PageHeader title="Duplikate bereinigen" eyebrow="Temporäres Admin-Tool" />

      <div className="max-w-2xl space-y-5">

        {/* Alle Juli-Tage Übersicht */}
        <Panel className="overflow-hidden">
          <div className="border-b border-grey-border px-5 py-3 font-mono text-xs font-bold text-grey-dark uppercase tracking-wider">
            Alle Verkäufe 10–16 Juli (exakte DB-Timestamps)
          </div>
          <div className="divide-y divide-grey-border max-h-96 overflow-y-auto">
            {allSalesRecent.map((r) => (
              <div key={r.date.toISOString()} className="flex items-center justify-between px-5 py-2.5 font-mono text-xs">
                <span className="text-grey-dark">{r.date.toISOString()}</span>
                <span className="text-grey-mid">{r._count} Einträge</span>
                <span className="font-bold text-brand-red">{r._sum.quantity} Stk.</span>
              </div>
            ))}
            {allSalesRecent.length === 0 && (
              <div className="px-5 py-4 text-grey-mid">Keine Einträge gefunden</div>
            )}
          </div>
        </Panel>

        {/* Datumsauswahl für Cleanup */}
        <form method="GET" className="flex items-end gap-3">
          <label className="grid gap-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Datum bereinigen</span>
            <input name="date" type="date" defaultValue={queryDate}
              className="h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none" />
          </label>
          <button type="submit" className="h-10 rounded-lg bg-brand-red px-4 text-sm font-semibold text-white hover:bg-brand-red-dark">
            Analysieren
          </button>
        </form>

        <Panel className="p-5 space-y-3">
          <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Diagnose für {queryDate} (UTC 00:00–23:59)</div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-mono text-2xl font-black text-grey-dark">{sales.length}</div>
              <div className="font-mono text-[10px] text-grey-mid uppercase tracking-wider mt-1">Datensätze</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-black text-grey-dark">{totalQty}</div>
              <div className="font-mono text-[10px] text-grey-mid uppercase tracking-wider mt-1">Menge gesamt</div>
            </div>
            <div>
              <div className={`font-mono text-2xl font-black ${duplicateCount > 0 ? "text-brand-red" : "text-green-700"}`}>{duplicateCount}</div>
              <div className="font-mono text-[10px] text-grey-mid uppercase tracking-wider mt-1">Duplikate</div>
            </div>
          </div>
        </Panel>

        {duplicateCount > 0 && (
          <form action={action}>
            <button type="submit" className="w-full rounded-lg bg-brand-red py-3 text-sm font-bold text-white hover:bg-brand-red-dark">
              {duplicateCount} Duplikate löschen & Bestand wiederherstellen
            </button>
          </form>
        )}

        {duplicateCount === 0 && sales.length > 0 && (
          <Panel className="p-5 text-center font-mono text-sm text-green-700">
            ✓ Keine Duplikate für {queryDate} — aber {totalQty} Stk. vorhanden
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
