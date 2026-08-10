import { deleteItem, upsertItem } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Field, Panel, SubmitButton } from "@/components/ui";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const today = new Date().toISOString().slice(0, 10);

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; von?: string; bis?: string }>;
}) {
  const user = await requireUser();
  const { q, sort, von, bis } = await searchParams;
  const query = q?.trim() ?? "";

  const orderBy =
    sort === "stock_asc"
      ? { stock: "asc" as const }
      : sort === "stock_desc"
      ? { stock: "desc" as const }
      : { createdAt: "asc" as const };

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = von ? new Date(`${von}T00:00:00`) : defaultFrom;
  const to   = bis ? new Date(`${bis}T23:59:59`) : now;
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);

  const vonStr = from.toISOString().slice(0, 10);
  const bisStr = to.toISOString().slice(0, 10);

  const [items, saleAgg] = await Promise.all([
    prisma.item.findMany({
      where: query ? { sku: { contains: query, mode: "insensitive" } } : undefined,
      orderBy,
    }),
    prisma.sale.groupBy({
      by: ["sku"],
      where: {
        date: { gte: from, lte: to },
        source: { in: ["TAGESVERKAUF", "LAGER"] },
      },
      _sum: { quantity: true },
    }),
  ]);
  const skuTotals = new Map(saleAgg.map((r) => [r.sku, r._sum.quantity ?? 0]));
  const canEdit = user.role === "ADMIN";

  function link(s?: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (s) params.set("sort", s);
    if (von) params.set("von", von);
    if (bis) params.set("bis", bis);
    const qs = params.toString();
    return `/inventory${qs ? `?${qs}` : ""}`;
  }

  return (
    <AppShell>
      <PageHeader title="Lager" eyebrow="Artikelverwaltung" />

      {/* Neues Produkt (nur Admin) */}
      {canEdit && (
        <Panel className="mb-6 p-5">
          <div className="mb-4 border-l-2 border-brand-red pl-3 text-sm font-bold text-grey-dark">Neues Produkt anlegen</div>
          <form action={upsertItem} className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <Field label="SKU" name="sku" placeholder="z.B. ELK105" />
            <Field label="Bezeichnung" name="name" placeholder="z.B. Induktionskochfeld..." />
            <Field label="Bestand Neuware-Lager" name="stock" type="number" defaultValue={0} />
            <Field label="Bestand NS-Lager" name="stockNS" type="number" defaultValue={0} />
            <Field label="Mindestbestand" name="minStock" type="number" defaultValue={0} />
            <div className="flex items-end">
              <SubmitButton>Anlegen</SubmitButton>
            </div>
          </form>
        </Panel>
      )}

      {/* Datumsfilter */}
      <form method="GET" className="mb-4 flex flex-wrap items-end gap-3">
        {sort && <input type="hidden" name="sort" value={sort} />}
        {query && <input type="hidden" name="q" value={query} />}
        <div className="flex items-center gap-2 rounded-lg border border-grey-border bg-white px-3 py-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-grey-mid">Von</span>
          <input
            type="date"
            name="von"
            defaultValue={vonStr}
            className="font-mono text-sm text-grey-dark focus:outline-none"
          />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-grey-mid">Bis</span>
          <input
            type="date"
            name="bis"
            defaultValue={bisStr}
            className="font-mono text-sm text-grey-dark focus:outline-none"
          />
        </div>
        <button type="submit" className="rounded-lg bg-brand-red px-4 py-2.5 font-mono text-sm font-semibold text-white hover:bg-brand-red-dark">
          Anwenden
        </button>
      </form>

      {/* Suche + Sortierung */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-grey-border bg-white p-1">
          <svg className="ml-2 h-3.5 w-3.5 flex-shrink-0 text-grey-mid" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <a href="/api/export/inventory?lager=neuware" className="rounded px-3 py-1.5 font-mono text-xs font-semibold text-grey-mid hover:bg-grey-light hover:text-grey-dark transition-colors">
            Neuware
          </a>
          <a href="/api/export/inventory?lager=ns" className="rounded px-3 py-1.5 font-mono text-xs font-semibold text-grey-mid hover:bg-grey-light hover:text-grey-dark transition-colors">
            NS-Lager
          </a>
          <a href="/api/export/inventory?lager=beide" className="rounded px-3 py-1.5 font-mono text-xs font-semibold text-grey-mid hover:bg-grey-light hover:text-grey-dark transition-colors">
            Beide
          </a>
        </div>
        <form method="GET" className="flex flex-1 max-w-lg gap-2">
          {sort && <input type="hidden" name="sort" value={sort} />}
          {von && <input type="hidden" name="von" value={von} />}
          {bis && <input type="hidden" name="bis" value={bis} />}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-mid" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              name="q"
              defaultValue={query}
              placeholder="z.B. H60 findet ELK150H60"
              autoComplete="off"
              className="w-full rounded-lg border border-grey-border bg-white py-2.5 pl-9 pr-4 font-mono text-sm text-grey-dark placeholder:text-grey-mid focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
            />
          </div>
          <button type="submit" className="rounded-lg bg-brand-red px-4 py-2.5 font-mono text-sm font-semibold text-white hover:bg-brand-red-dark">
            Suchen
          </button>
          {(query || sort) && (
            <a href="/inventory" className="flex items-center rounded-lg border border-grey-border bg-white px-4 py-2.5 font-mono text-sm text-grey-mid hover:text-brand-red">
              ✕ Zurücksetzen
            </a>
          )}
        </form>

        {/* Sortier-Buttons */}
        <div className="flex items-center gap-1 rounded-lg border border-grey-border bg-white p-1">
          <a href={link(undefined)} className={`rounded px-3 py-1.5 font-mono text-xs font-semibold transition-colors ${!sort ? "bg-brand-red text-white" : "text-grey-mid hover:text-grey-dark"}`}>
            Standard
          </a>
          <a href={link("stock_desc")} className={`rounded px-3 py-1.5 font-mono text-xs font-semibold transition-colors ${sort === "stock_desc" ? "bg-brand-red text-white" : "text-grey-mid hover:text-grey-dark"}`}>
            Bestand ↓
          </a>
          <a href={link("stock_asc")} className={`rounded px-3 py-1.5 font-mono text-xs font-semibold transition-colors ${sort === "stock_asc" ? "bg-brand-red text-white" : "text-grey-mid hover:text-grey-dark"}`}>
            Bestand ↑
          </a>
        </div>
      </div>

      {query && (
        <p className="mb-3 font-mono text-[11px] text-grey-mid">
          {items.length} Ergebnis{items.length !== 1 ? "se" : ""} für „{query}"
        </p>
      )}

      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-grey-border bg-grey-light">
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">SKU</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Bezeichnung</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Neuware-Lager</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">NS-Lager</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Ø&nbsp;/&nbsp;Tag</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Status</th>
              {canEdit && <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Aktion</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-border">
            {items.map((item) => (
              <tr key={item.sku} className="transition-colors hover:bg-grey-light/60">
                <td className="px-4 py-3 font-mono text-sm font-semibold text-brand-red">{item.sku}</td>
                <td className="px-4 py-3 text-sm text-grey-dark">{item.name || <span className="text-grey-mid italic">—</span>}</td>
                <td className="px-4 py-3 font-mono tabular-nums font-semibold text-grey-dark">{item.stock}</td>
                <td className="px-4 py-3 font-mono tabular-nums font-semibold text-grey-dark">{item.stockNS}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-sm">
                  {(() => {
                    const avg = ((skuTotals.get(item.sku) ?? 0) / days).toFixed(1);
                    return <span className={avg === "0.0" ? "text-grey-mid" : "font-semibold text-grey-dark"}>{avg}</span>;
                  })()}
                </td>
                <td className="px-4 py-3">
                  {item.stock < item.minStock ? (
                    <span className="inline-flex items-center gap-1.5 rounded border border-brand-red/20 bg-brand-red/8 px-2 py-1 font-mono text-xs font-semibold text-brand-red">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
                      Unter Mindestbestand
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded border border-green-200 bg-green-50 px-2 py-1 font-mono text-xs font-semibold text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      OK
                    </span>
                  )}
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <form action={deleteItem}>
                      <input type="hidden" name="sku" value={item.sku} />
                      <SubmitButton tone="danger">Löschen</SubmitButton>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-8 text-center font-mono text-xs text-grey-mid">
            {query ? `Keine SKU enthält „${query}".` : "Noch keine Artikel vorhanden."}
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
