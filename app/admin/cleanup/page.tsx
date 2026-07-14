import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { fixSalesDate } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function CleanupPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  // Alle Verkäufe der letzten 3 Tage: zeige date vs createdAt
  const from = new Date("2026-07-12T00:00:00.000Z");
  const to   = new Date("2026-07-14T23:59:59.999Z");

  const sales = await prisma.sale.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { createdAt: "desc" },
    select: { id: true, sku: true, marketplace: true, quantity: true, date: true, createdAt: true },
  });

  // Gruppiere nach: Verkaufsdatum (date) + Erstelldatum (createdAt-Tag)
  const byDateCombo = new Map<string, { count: number; qty: number }>();
  for (const s of sales) {
    const saleDay = s.date.toISOString().slice(0, 10);
    const createDay = s.createdAt.toISOString().slice(0, 10);
    const key = `sale:${saleDay} | erstellt:${createDay}`;
    const cur = byDateCombo.get(key) ?? { count: 0, qty: 0 };
    byDateCombo.set(key, { count: cur.count + 1, qty: cur.qty + s.quantity });
  }

  // Verdächtige Einträge: sale.date = 13.07 aber createdAt = 14.07
  const suspicious = sales.filter((s) => {
    const saleDay  = s.date.toISOString().slice(0, 10);
    const createDay = s.createdAt.toISOString().slice(0, 10);
    return saleDay === "2026-07-13" && createDay === "2026-07-14";
  });

  const suspQty = suspicious.reduce((s, r) => s + r.quantity, 0);

  const fixAction = fixSalesDate.bind(null, "2026-07-13", "2026-07-14");

  return (
    <AppShell>
      <PageHeader title="Datums-Diagnose" eyebrow="Temporäres Admin-Tool" />

      <div className="max-w-2xl space-y-5">

        {/* Übersicht: sale-date vs. createdAt */}
        <Panel className="overflow-hidden">
          <div className="border-b border-grey-border px-5 py-3 font-mono text-xs font-bold text-grey-dark uppercase tracking-wider">
            Verkaufsdatum vs. Erstelldatum (12–14 Juli)
          </div>
          <div className="divide-y divide-grey-border">
            {[...byDateCombo.entries()].map(([key, val]) => (
              <div key={key} className={`flex items-center justify-between px-5 py-3 font-mono text-xs ${key.includes("sale:2026-07-13") && key.includes("erstellt:2026-07-14") ? "bg-orange-50" : ""}`}>
                <span className="text-grey-dark">{key}</span>
                <span className="text-grey-mid">{val.count} Einträge</span>
                <span className="font-bold text-brand-red">{val.qty} Stk.</span>
              </div>
            ))}
            {byDateCombo.size === 0 && <div className="px-5 py-4 text-grey-mid font-mono text-xs">Keine Einträge</div>}
          </div>
        </Panel>

        {/* Verdächtige Einträge */}
        {suspicious.length > 0 && (
          <Panel className="p-5 space-y-4 border-2 border-orange-300">
            <div className="border-l-2 border-orange-500 pl-3 text-sm font-bold text-orange-700">
              ⚠ {suspicious.length} Einträge: Verkaufsdatum 13.07 aber heute (14.07) erstellt
            </div>
            <p className="text-sm text-grey-mid">
              Diese Verkäufe wurden heute importiert, aber mit dem Datum 13.07 statt 14.07 gespeichert.
              Das Datum kann auf 14.07 korrigiert werden. Menge: <strong>{suspQty} Stk.</strong>
            </p>
            <form action={fixAction}>
              <button type="submit" className="w-full rounded-lg bg-orange-600 py-3 text-sm font-bold text-white hover:bg-orange-700">
                Datum korrigieren: {suspicious.length} Einträge von 13.07 → 14.07
              </button>
            </form>
          </Panel>
        )}

        {suspicious.length === 0 && (
          <Panel className="p-5 text-center font-mono text-sm text-green-700">
            ✓ Keine verdächtigen Einträge (sale 13.07 + erstellt 14.07) gefunden
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
