import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MONTH_NAMES = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

export default async function DashboardPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [salesToday, salesMonth, salesLastMonth, herdsetToday, lowStock, topSkus, dailySales] = await Promise.all([
    prisma.sale.aggregate({ where: { date: { gte: todayStart } }, _sum: { quantity: true } }),
    prisma.sale.aggregate({ where: { date: { gte: monthStart, lte: monthEnd } }, _sum: { quantity: true } }),
    prisma.sale.aggregate({ where: { date: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { quantity: true } }),
    prisma.herdsetSale.aggregate({ where: { date: { gte: todayStart } }, _sum: { quantity: true } }),
    prisma.item.findMany({ where: { stock: { lt: 100 } }, orderBy: { stock: "asc" }, select: { sku: true, stock: true } }),
    prisma.sale.groupBy({
      by: ["sku"],
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    prisma.sale.groupBy({
      by: ["date"],
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { quantity: true },
    }),
  ]);

  // Build day-by-day map for chart
  const dayMap = new Map<number, number>();
  for (const row of dailySales) {
    const day = new Date(row.date).getDate();
    dayMap.set(day, (dayMap.get(day) ?? 0) + (row._sum.quantity ?? 0));
  }
  const chartData = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, qty: dayMap.get(i + 1) ?? 0 }));
  const maxQty = Math.max(...chartData.map((d) => d.qty), 1);
  const monthLabel = MONTH_NAMES[now.getMonth()];
  const thisMonthQty = salesMonth._sum.quantity ?? 0;
  const lastMonthQty = salesLastMonth._sum.quantity ?? 0;
  const pct = lastMonthQty > 0 ? Math.round(((thisMonthQty - lastMonthQty) / lastMonthQty) * 100) : null;

  return (
    <AppShell>
      <PageHeader title="Dashboard" eyebrow="Übersicht" />

      {/* Zeile 1: 3 Metriken */}
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Verkäufe heute" value={salesToday._sum.quantity ?? 0} />
        <Metric label="Herdsets heute" value={herdsetToday._sum.quantity ?? 0} />
        <Metric label={`Verkäufe ${monthLabel}`} value={thisMonthQty} pct={pct} />
      </div>

      {/* Zeile 2: Niedrig-Bestand + Top-Verkäufe */}
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {/* Artikel unter 100 Stück */}
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-grey-border px-5 py-3">
            <div className="border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Artikel unter 100 Stück</div>
            <span className="font-mono text-xs font-bold text-brand-red">{lowStock.length}</span>
          </div>
          {lowStock.length === 0 ? (
            <div className="p-5 font-mono text-xs text-grey-mid">✓ Alle Artikel über 100 Stück</div>
          ) : (
            <div className="max-h-64 divide-y divide-grey-border overflow-y-auto">
              {lowStock.map((item) => (
                <div key={item.sku} className="flex items-center justify-between px-5 py-2.5">
                  <span className="font-mono text-sm font-semibold text-brand-red">{item.sku}</span>
                  <span className="font-mono tabular-nums text-sm text-grey-dark">{item.stock} Stk.</span>
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
