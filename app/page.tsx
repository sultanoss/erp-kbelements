import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { VersandFertigButton } from "@/components/versand-fertig";
import { VersandAbgeschlossenButton } from "@/components/versand-abgeschlossen-button";
import { SpaeterVersandCard } from "@/app/spaeter-versand/SpaeterVersandCard";

export const dynamic = "force-dynamic";

const MONTH_NAMES = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

export default async function DashboardPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const daysInMonth = monthEnd.getDate();

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [salesToday, salesMonth, salesLastMonth, herdsetToday, lowStock, topSkus, dailySales, rawOpenItems, laterShipments] = await Promise.all([
    prisma.sale.aggregate({ where: { date: { gte: todayStart }, source: { in: ["TAGESVERKAUF", "LAGER"] }, marketplace: { not: "EBAY_OUTLET" } }, _sum: { quantity: true } }),
    prisma.sale.aggregate({ where: { date: { gte: monthStart, lte: monthEnd }, source: { in: ["TAGESVERKAUF", "LAGER"] }, marketplace: { not: "EBAY_OUTLET" } }, _sum: { quantity: true } }),
    prisma.sale.aggregate({ where: { date: { gte: lastMonthStart, lte: lastMonthEnd }, source: { in: ["TAGESVERKAUF", "LAGER"] }, marketplace: { not: "EBAY_OUTLET" } }, _sum: { quantity: true } }),
    prisma.herdsetSale.aggregate({ where: { date: { gte: todayStart } }, _sum: { quantity: true } }),
    prisma.item.findMany({ orderBy: { stock: "asc" }, select: { sku: true, stock: true, minStock: true } }),
    prisma.sale.groupBy({
      by: ["sku"],
      where: { date: { gte: monthStart, lte: monthEnd }, source: { in: ["TAGESVERKAUF", "LAGER"] }, marketplace: { not: "EBAY_OUTLET" } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    prisma.sale.groupBy({
      by: ["date"],
      where: { date: { gte: monthStart, lte: monthEnd }, source: { in: ["TAGESVERKAUF", "LAGER"] }, marketplace: { not: "EBAY_OUTLET" } },
      _sum: { quantity: true },
    }),
    prisma.orderItem.findMany({
      where: {
        order: { status: "NEU", isHerdset: false, marketplace: { not: "EBAY_OUTLET" } },
      },
      select: {
        internalSku: true,
        marketplaceSku: true,
        quantity: true,
        order: { select: { marketplace: true, orderNumber: true, id: true } },
      },
    }),
    prisma.laterShipment.findMany({ orderBy: { shippingDate: "asc" } }),
  ]);

  // Build day-by-day map for chart
  const dayMap = new Map<number, number>();
  for (const row of dailySales) {
    const day = new Date(row.date).getDate();
    dayMap.set(day, (dayMap.get(day) ?? 0) + (row._sum.quantity ?? 0));
  }
  const lowStockItems = lowStock.filter((i) => i.stock < i.minStock);
  const chartData = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, qty: dayMap.get(i + 1) ?? 0 }));
  const maxQty = Math.max(...chartData.map((d) => d.qty), 1);
  const monthLabel = MONTH_NAMES[now.getMonth()];
  const thisMonthQty = salesMonth._sum.quantity ?? 0;
  const lastMonthQty = salesLastMonth._sum.quantity ?? 0;
  const pct = lastMonthQty > 0 ? Math.round(((thisMonthQty - lastMonthQty) / lastMonthQty) * 100) : null;

  const portalMap = new Map<string, number>();
  let totalOpenUnits = 0;
  let combinedOrderLines = 0;
  const setItems: { sku: string; quantity: number; marketplace: string; orderNumber: string; orderId: string }[] = [];
  for (const item of rawOpenItems) {
    const sku = item.internalSku ?? item.marketplaceSku ?? "";
    const parts = sku.split("/").filter(Boolean);
    const units = Math.max(1, parts.length) * (item.quantity ?? 1);
    totalOpenUnits += units;
    if (parts.length > 1) {
      combinedOrderLines += 1;
      setItems.push({ sku, quantity: item.quantity ?? 1, marketplace: item.order.marketplace, orderNumber: item.order.orderNumber ?? "", orderId: item.order.id });
    }
    const mp = item.order.marketplace;
    portalMap.set(mp, (portalMap.get(mp) ?? 0) + units);
  }
  const portalBreakdown = [...portalMap.entries()].sort((a, b) => b[1] - a[1]);

  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dueCount = laterShipments.filter(
    (e) => e.shippingDate.toISOString().slice(0, 10) === todayDateStr
  ).length;

  return (
    <AppShell>
      <PageHeader title="Dashboard" eyebrow="Übersicht" />

      <div className="mb-5 flex items-center gap-3">
        <VersandFertigButton />
        <VersandAbgeschlossenButton />
      </div>

      {/* Zeile 1: 4 Metriken */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Metric label="Verkäufe heute" value={salesToday._sum.quantity ?? 0} />
        <Metric label="Herdsets heute" value={herdsetToday._sum.quantity ?? 0} />
        <Metric label={`Verkäufe ${monthLabel}`} value={thisMonthQty} pct={pct} />
        <SpaeterVersandCard initialEntries={laterShipments} dueCount={dueCount} />
        {/* Offene Bestellungen — temporär ausgeblendet
        <Panel className="p-5">
          <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Offene Bestellungen</div>
          <div className="flex items-end gap-3">
            <div className="font-mono text-4xl font-black tabular-nums" style={{ color: "#d97706" }}>{totalOpenUnits}</div>
            {combinedOrderLines > 0 && (
              <div className="mb-1 font-mono text-xs font-semibold text-grey-mid">davon {combinedOrderLines} Sets</div>
            )}
          </div>
          {portalBreakdown.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer list-none font-mono text-xs text-grey-mid select-none hover:text-grey-dark">▶ Nach Portal</summary>
              <div className="mt-2 divide-y divide-grey-border">
                {portalBreakdown.map(([mp, qty]) => (
                  <div key={mp} className="flex justify-between py-1.5">
                    <span className="font-mono text-[10px] font-bold text-grey-dark uppercase">{mp}</span>
                    <span className="font-mono text-[10px] font-bold tabular-nums" style={{ color: "#d97706" }}>{qty} Stk.</span>
                  </div>
                ))}
              </div>
            </details>
          )}
          {setItems.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer list-none font-mono text-xs text-grey-mid select-none hover:text-grey-dark">▶ Sets ({setItems.length})</summary>
              <div className="mt-2 divide-y divide-grey-border max-h-48 overflow-y-auto">
                {setItems.map((s, i) => (
                  <a key={i} href={`/bestellungen/${s.orderId}`} className="flex items-center justify-between gap-2 py-1.5 hover:bg-grey-light/50 -mx-1 px-1 rounded transition-colors">
                    <span className="font-mono text-[10px] font-semibold text-grey-dark">{s.sku}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-mono text-[10px] text-grey-mid uppercase">{s.marketplace}</span>
                      {s.orderNumber && <span className="font-mono text-[10px] text-grey-mid">#{s.orderNumber}</span>}
                    </div>
                  </a>
                ))}
              </div>
            </details>
          )}
        </Panel>
        */}
      </div>

      {/* Zeile 2: Niedrig-Bestand + Top-Verkäufe */}
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {/* Mindestbestand unterschritten */}
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-grey-border px-5 py-3">
            <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Unter Mindestbestand</div>
            {lowStockItems.length > 0 && (
              <span className="font-mono text-xs font-bold text-brand-red">{lowStockItems.length} Artikel</span>
            )}
          </div>
          {lowStockItems.length === 0 ? (
            <div className="p-5 font-mono text-xs text-grey-mid">✓ Alle Artikel über Mindestbestand</div>
          ) : (
            <div className="max-h-64 divide-y divide-grey-border overflow-y-auto">
              {lowStockItems.map((item) => (
                <div key={item.sku} className="flex items-center justify-between px-5 py-2.5">
                  <span className="font-mono text-sm font-semibold text-brand-red">{item.sku}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums text-sm text-grey-dark">{item.stock} Stk.</span>
                    <span className="font-mono text-xs text-grey-mid">(Min. {item.minStock})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Top-Verkäufe diesen Monat */}
        <Panel className="overflow-hidden">
          <div className="border-b border-grey-border px-5 py-3">
            <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Top-Verkäufe {monthLabel}</div>
          </div>
          {topSkus.length === 0 ? (
            <div className="p-5 font-mono text-xs text-grey-mid">Noch keine Verkäufe diesen Monat.</div>
          ) : (
            <div className="divide-y divide-grey-border">
              {topSkus.map((row, i) => (
                <div key={row.sku} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="w-5 font-mono text-xs text-grey-mid">{i + 1}.</span>
                  <span className="flex-1 font-mono text-sm font-semibold text-brand-red">{row.sku}</span>
                  <span className="font-mono tabular-nums text-sm text-grey-dark">{row._sum.quantity} Stk.</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Zeile 3: Monatsdiagramm */}
      <div className="mt-5">
        <Panel className="overflow-hidden">
          <div className="border-b border-grey-border px-5 py-3">
            <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Verkäufe {monthLabel} — Tag für Tag</div>
          </div>
          <div className="p-5">
            <SalesChart data={chartData} maxQty={maxQty} />
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, pct }: { label: string; value: number; pct?: number | null }) {
  return (
    <Panel className="p-5">
      <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">{label}</div>
      <div className="flex items-end gap-3">
        <div className="font-mono text-4xl font-black tabular-nums text-grey-dark">{value}</div>
        {pct !== null && pct !== undefined && (
          <span className={`mb-1 font-mono text-sm font-bold tabular-nums ${pct >= 0 ? "text-green-600" : "text-brand-red"}`}>
            {pct >= 0 ? "+" : ""}{pct}%
          </span>
        )}
      </div>
    </Panel>
  );
}

function SalesChart({ data, maxQty }: { data: { day: number; qty: number }[]; maxQty: number }) {
  const W = 800;
  const H = 180;
  const padL = 32;
  const padR = 8;
  const padT = 12;
  const padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = Math.max(4, chartW / data.length - 3);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
      {/* Y-Achse Hilfslinien */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padT + chartH * (1 - frac);
        const val = Math.round(maxQty * frac);
        return (
          <g key={frac}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#e5e5e5" strokeWidth="1" />
            {frac > 0 && (
              <text x={padL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#666" fontFamily="monospace">
                {val}
              </text>
            )}
          </g>
        );
      })}

      {/* Balken */}
      {data.map(({ day, qty }) => {
        const x = padL + ((day - 1) / data.length) * chartW + (chartW / data.length - barW) / 2;
        const barH = qty === 0 ? 0 : Math.max(3, (qty / maxQty) * chartH);
        const y = padT + chartH - barH;
        return (
          <g key={day}>
            {qty > 0 && (
              <rect x={x} y={y} width={barW} height={barH} fill="#C0182A" rx="2" />
            )}
            {/* X-Achse: nur jeden 5. Tag oder wenn Wert > 0 */}
            {(day % 5 === 0 || day === 1 || qty > 0) && (
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="9" fill="#666" fontFamily="monospace">
                {day}
              </text>
            )}
            {/* Wert über Balken */}
            {qty > 0 && (
              <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="9" fill="#C0182A" fontWeight="700" fontFamily="monospace">
                {qty}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
