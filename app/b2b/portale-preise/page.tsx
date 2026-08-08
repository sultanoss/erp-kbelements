import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { fetchOttoPrices } from "@/lib/connectors/otto";
import { fetchMediaMarktPrices } from "@/lib/connectors/mediamarkt";
import { fetchKauflandPrices } from "@/lib/connectors/kaufland";
import { fetchEbayPrices } from "@/lib/connectors/ebay";

export const dynamic = "force-dynamic";

type PortalEntry = { marketplaceSku: string; title: string | null; price: number };
type PortalResult = { entries: PortalEntry[]; error: boolean };

async function safeFetch<T>(fn: () => Promise<T[]>): Promise<{ entries: T[]; error: boolean }> {
  try {
    return { entries: await fn(), error: false };
  } catch {
    return { entries: [], error: true };
  }
}

function PriceTable({ result, portal }: { result: PortalResult; portal: string }) {
  if (result.error) {
    return (
      <div className="rounded-lg border border-grey-border bg-orange-50 px-4 py-3 font-mono text-xs text-orange-700">
        {portal}: API nicht erreichbar
      </div>
    );
  }
  if (result.entries.length === 0) {
    return (
      <div className="rounded-lg border border-grey-border bg-grey-light px-4 py-3 font-mono text-xs text-grey-mid">
        {portal}: Keine Einträge gefunden
      </div>
    );
  }
  return (
    <Panel className="overflow-x-auto">
      <div className="border-b border-grey-border px-4 py-2.5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">{portal}</span>
        <span className="ml-2 font-mono text-[10px] text-grey-mid">({result.entries.length} Artikel)</span>
      </div>
      <table className="w-full min-w-[500px] text-sm">
        <thead>
          <tr className="border-b border-grey-border bg-grey-light">
            <th className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Portal-SKU</th>
            <th className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Bezeichnung</th>
            <th className="px-4 py-2.5 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Verkaufspreis</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-grey-border">
          {result.entries.map((e, i) => (
            <tr key={i} className="hover:bg-grey-light/50">
              <td className="px-4 py-2.5 font-mono text-xs font-semibold text-brand-red">{e.marketplaceSku}</td>
              <td className="px-4 py-2.5 text-xs text-grey-dark">{e.title ?? "—"}</td>
              <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold tabular-nums text-grey-dark">
                {e.price.toFixed(2)} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

export default async function PortalePreisePage() {
  const [otto, mediamarkt, kaufland, ebay, ebayOutlet] = await Promise.all([
    safeFetch(fetchOttoPrices),
    safeFetch(fetchMediaMarktPrices),
    safeFetch(fetchKauflandPrices),
    safeFetch(() => fetchEbayPrices("main")),
    safeFetch(() => fetchEbayPrices("outlet")),
  ]);

  return (
    <AppShell>
      <PageHeader title="Portale Preise" eyebrow="B2B" />
      <div className="space-y-5 max-w-5xl">
        <PriceTable result={otto} portal="Otto" />
        <PriceTable result={mediamarkt} portal="MediaMarkt" />
        <PriceTable result={kaufland} portal="Kaufland" />
        <PriceTable result={ebay} portal="eBay" />
        <PriceTable result={ebayOutlet} portal="eBay Outlet" />
      </div>
    </AppShell>
  );
}
