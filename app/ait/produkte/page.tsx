import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { AitProduktRow } from "./produkt-row";

export const dynamic = "force-dynamic";

export default async function AitProdukteePage() {
  await requireUser();

  const items = await prisma.item.findMany({
    orderBy: { sku: "asc" },
    select: { sku: true, name: true, aitWeight: true, aitHeight: true, aitWidth: true, aitDepth: true },
  });

  return (
    <AppShell>
      <PageHeader title="AIT Produkte" eyebrow="AIT Spedition" />
      <p className="mb-4 text-sm text-grey-mid">
        Gewicht und Maße werden für die AIT-Auftragsübertragung benötigt. m³ wird automatisch berechnet.
      </p>

      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-grey-border bg-grey-light">
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">SKU</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Bezeichnung</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Gewicht (kg)</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Höhe (cm)</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Breite (cm)</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Tiefe (cm)</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">m³</th>
              <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-border">
            {items.map((item) => (
              <AitProduktRow key={item.sku} item={item} />
            ))}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
