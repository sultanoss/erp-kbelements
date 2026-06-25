import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Panel } from "@/components/ui";
import { HerdsetImport } from "@/components/herdset-import";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MARKETPLACE_LABELS: Record<string, string> = {
  OTTO: "Otto",
  KAUFLAND: "Kaufland",
  MEDIAMARKT: "Media Markt",
  AMAZON: "Amazon",
  EBAY: "Ebay",
  SHOPIFY: "Shopify",
  DIREKT: "Lager / Direkt",
};

function getMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from, to };
}

export default async function AuswertungPage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; bis?: string }>;
}) {
  const { von, bis } = await searchParams;
  const { from: defaultFrom, to: defaultTo } = getMonthRange();

  const from = von ? new Date(`${von}T00:00:00`) : defaultFrom;
  const to = bis ? new Date(`${bis}T23:59:59`) : defaultTo;

  // Reguläre Verkäufe
  const rows = await prisma.sale.groupBy({
    by: ["marketplace", "sku"],
    where: { date: { gte: from, lte: to } },
    _sum: { quantity: true },
    orderBy: [{ marketplace: "asc" }, { sku: "asc" }],
  });

  const byMarketplace = new Map<string, { sku: string; quantity: number }[]>();
  for (const row of rows) {
    if (!byMarketplace.has(row.marketplace)) byMarketplace.set(row.marketplace, []);
    byMarketplace.get(row.marketplace)!.push({ sku: row.sku, quantity: row._sum.quantity ?? 0 });
  }

  // Herdsets & Einbaubacköfen
  const herdsetRows = await prisma.herdsetSale.groupBy({
    by: ["marketplace", "label"],
    where: { date: { gte: from, lte: to } },
    _sum: { quantity: true },
    orderBy: [{ marketplace: "asc" }, { label: "asc" }],
  });

  const herdsetByMarketplace = new Map<string, { label: string; quantity: number }[]>();
  for (const row of herdsetRows) {
    if (!herdsetByMarketplace.has(row.marketplace)) herdsetByMarketplace.set(row.marketplace, []);
    herdsetByMarketplace.get(row.marketplace)!.push({ label: row.label, quantity: row._sum.quantity ?? 0 });
  }

  const skuRows = await prisma.sale.groupBy({
    by: ["sku"],
    where: { date: { gte: from, lte: to } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
  });
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);
  const totalSales = rows.reduce((s, r) => s + (r._sum.quantity ?? 0), 0);
  const totalHerdsets = herdsetRows.reduce((s, r) => s + (r._sum.quantity ?? 0), 0);

  return (
    <AppShell>
      <PageHeader title="Auswertung" eyebrow="Verkäufe nach Marktplatz" />

      {/* Datumsfilter */}
      <form method="GET" className="mb-8 flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Von</span>
          <input
            name="von"
            type="date"
            min="2026-06-25"
            defaultValue={fromStr}
            className="h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Bis</span>
          <input
            name="bis"
            type="date"
            min="2026-06-25"
            defaultValue={toStr}
            className="h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
          />
        </label>
        <button
          type="submit"
          className="h-10 rounded-lg bg-brand-red px-4 text-sm font-semibold text-white hover:bg-brand-red-dark"
        >
          Anzeigen
        </button>
        {(totalSales > 0 || totalHerdsets > 0) && (
          <span className="ml-2 self-end pb-2 font-mono text-xs text-grey-mid">
            {totalSales} Einzelverkäufe · {totalHerdsets} Herdsets
          </span>
        )}
      </form>

      {/* ── Ø Tagesverkauf pro SKU ── */}
      <div className="mb-3 flex items-center gap-3">
        <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Ø Tagesverkauf pro Produkt</div>
        <div className="h-px flex-1 bg-grey-border" />
        <span className="font-mono text-[10px] text-grey-mid">{days} {days === 1 ? "Tag" : "Tage"}</span>
      </div>

      {skuRows.length === 0 ? (
        <Panel className="mb-8 p-6 text-center font-mono text-sm text-grey-mid">
          Keine Verkäufe im gewählten Zeitraum.
        </Panel>
      ) : (
        <Panel className="mb-8 overflow-hidden">
          <div className="flex items-center justify-between border-b border-grey-border bg-grey-light px-5 py-3">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-grey-dark">SKU</span>
            <div className="flex gap-8">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-grey-dark">Gesamt</span>
              <span className="w-16 text-right font-mono text-xs font-bold uppercase tracking-[0.15em] text-grey-dark">Ø / Tag</span>
            </div>
          </div>
          <div className="divide-y divide-grey-border">
            {skuRows.map((row) => {
              const total = row._sum.quantity ?? 0;
              const avg = (total / days).toFixed(1);
              return (
                <div key={row.sku} className="flex items-center justify-between px-5 py-2.5">
                  <span className="font-mono text-sm font-semibold text-brand-red">{row.sku}</span>
                  <div className="flex gap-8">
                    <span className="font-mono tabular-nums text-sm text-grey-mid">{total} Stk.</span>
                    <span className="w-16 text-right font-mono tabular-nums text-sm font-bold text-grey-dark">{avg}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ── Abschnitt 1: Einzelprodukte ── */}
      <div className="mb-3 flex items-center gap-3">
        <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Einzelprodukte</div>
        <div className="h-px flex-1 bg-grey-border" />
      </div>

      {byMarketplace.size === 0 ? (
        <Panel className="mb-8 p-6 text-center font-mono text-sm text-grey-mid">
          Keine Einzelverkäufe im gewählten Zeitraum.
        </Panel>
      ) : (
        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from(byMarketplace.entries()).map(([mp, items]) => {
            const total = items.reduce((s, i) => s + i.quantity, 0);
            return (
              <Panel key={mp} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-grey-border bg-grey-light px-5 py-3">
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-grey-dark">
                    {MARKETPLACE_LABELS[mp] ?? mp}
                  </span>
                  <span className="font-mono text-xs font-semibold text-grey-mid">{total} Stk.</span>
                </div>
                <div className="divide-y divide-grey-border">
                  {items.map((item) => (
                    <div key={item.sku} className="flex items-center justify-between px-5 py-2.5">
                      <span className="font-mono text-sm font-semibold text-brand-red">{item.sku}</span>
                      <span className="font-mono tabular-nums text-sm font-bold text-grey-dark">{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* ── Abschnitt 2: Herdsets & Einbaubacköfen ── */}
      <div className="mb-3 flex items-center gap-3">
        <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Herdsets &amp; Einbaubacköfen</div>
        <div className="h-px flex-1 bg-grey-border" />
      </div>

      {herdsetByMarketplace.size === 0 ? (
        <Panel className="mb-6 p-6 text-center font-mono text-sm text-grey-mid">
          Keine Herdset-Verkäufe im gewählten Zeitraum.
        </Panel>
      ) : (
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from(herdsetByMarketplace.entries()).map(([mp, items]) => {
            const total = items.reduce((s, i) => s + i.quantity, 0);
            return (
              <Panel key={mp} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-grey-border bg-grey-light px-5 py-3">
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-grey-dark">
                    {MARKETPLACE_LABELS[mp] ?? mp}
                  </span>
                  <span className="font-mono text-xs font-semibold text-grey-mid">{total} Stk.</span>
                </div>
                <div className="divide-y divide-grey-border">
                  {items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between px-5 py-2.5">
                      <span className="font-mono text-sm font-semibold text-brand-red">{item.label}</span>
                      <span className="font-mono tabular-nums text-sm font-bold text-grey-dark">{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* ── Upload Herdsets ── */}
      <div className="mb-3 flex items-center gap-3">
        <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Herdsets hochladen</div>
        <div className="h-px flex-1 bg-grey-border" />
      </div>
      <Panel className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-grey-mid">
            Format: Portal als Abschnitt (Amazon, Mediamarkt, Otto …), darunter Artikel und Menge
          </p>
          <a
            href="/api/template?type=herdsets"
            className="font-mono text-xs font-semibold text-brand-red hover:underline"
          >
            ↓ Template herunterladen
          </a>
        </div>
        <HerdsetImport />
      </Panel>
    </AppShell>
  );
}
