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

  const from = new Date(`${queryDate}T00:00:00.000Z`);
  const to   = new Date(`${queryDate}T23:59:59.999Z`);

  const sales = await prisma.sale.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { createdAt: "asc" },
    select: { id: true, sku: true, marketplace: true, quantity: true, createdAt: true, date: true },
  });

  // Gruppen nach SKU+Marktplatz
  const groups = new Map<string, typeof sales>();
  for (const s of sales) {
    const key = `${s.sku}__${s.marketplace}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const totalQty = sales.reduce((s, r) => s + r.quantity, 0);
  const uniqueGroups = [...groups.values()];
  const duplicateGroups = uniqueGroups.filter((g) => g.length > 1);
  const duplicateCount = duplicateGroups.reduce((s, g) => s + g.length - 1, 0);

  const action = cleanupDuplicateSales.bind(null, queryDate);

  return (
    <AppShell>
      <PageHeader title="Duplikate bereinigen" eyebrow="Temporäres Admin-Tool" />

      <div className="max-w-2xl space-y-5">
        {/* Datumsauswahl */}
        <form method="GET" className="flex items-end gap-3">
          <label className="grid gap-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Datum prüfen</span>
            <input
              name="date"
              type="date"
              defaultValue={queryDate}
              className="h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none"
            />
          </label>
          <button type="submit" className="h-10 rounded-lg bg-brand-red px-4 text-sm font-semibold text-white hover:bg-brand-red-dark">
            Analysieren
          </button>
        </form>

        {/* Übersicht */}
        <Panel className="p-5 space-y-3">
          <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">
            Diagnose für {queryDate}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-mono text-2xl font-black text-grey-dark">{sales.length}</div>
              <div className="font-mono text-[10px] text-grey-mid uppercase tracking-wider mt-1">Datensätze gesamt</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-black text-grey-dark">{totalQty}</div>
              <div className="font-mono text-[10px] text-grey-mid uppercase tracking-wider mt-1">Menge gesamt</div>
            </div>
            <div>
              <div className={`font-mono text-2xl font-black ${duplicateCount > 0 ? "text-brand-red" : "text-green-700"}`}>
                {duplicateCount}
              </div>
              <div className="font-mono text-[10px] text-grey-mid uppercase tracking-wider mt-1">Duplikate gefunden</div>
            </div>
          </div>
        </Panel>

        {/* Duplikate Detail */}
        {duplicateGroups.length > 0 && (
          <Panel className="overflow-hidden">
            <div className="border-b border-grey-border px-5 py-3 font-mono text-xs font-bold text-brand-red uppercase tracking-wider">
              Doppelte Einträge (wird behalten: erster / löschen: alle weiteren)
            </div>
            <div className="divide-y divide-grey-border max-h-80 overflow-y-auto">
              {duplicateGroups.map((group) => (
                <div key={`${group[0].sku}__${group[0].marketplace}`} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-sm font-bold text-brand-red">{group[0].sku}</span>
                    <span className="font-mono text-xs text-grey-mid">{group[0].marketplace}</span>
                    <span className="font-mono text-xs font-bold text-orange-600">{group.length}× importiert</span>
                  </div>
                  {group.map((s, i) => (
                    <div key={s.id} className={`flex items-center justify-between text-xs font-mono py-0.5 ${i === 0 ? "text-green-700" : "text-grey-mid line-through"}`}>
                      <span>{i === 0 ? "✓ behalten" : "✗ löschen"}</span>
                      <span>Menge: {s.quantity}</span>
                      <span>{s.createdAt.toISOString().replace("T", " ").slice(0, 19)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Panel>
        )}

        {duplicateCount === 0 && (
          <Panel className="p-5 text-center font-mono text-sm text-green-700">
            ✓ Keine Duplikate gefunden für {queryDate}
          </Panel>
        )}

        {/* Cleanup Button */}
        {duplicateCount > 0 && (
          <form action={action}>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand-red py-3 text-sm font-bold text-white hover:bg-brand-red-dark"
            >
              {duplicateCount} Duplikate löschen & Bestand wiederherstellen
            </button>
            <p className="mt-2 text-center font-mono text-xs text-grey-mid">
              Bestand wird für jeden gelöschten Eintrag automatisch zurückgebucht.
            </p>
          </form>
        )}
      </div>
    </AppShell>
  );
}
