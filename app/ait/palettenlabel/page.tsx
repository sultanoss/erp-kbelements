import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PalettenlabelPage() {
  await requireUser();

  const items = await prisma.item.findMany({
    orderBy: { sku: "asc" },
    select: { sku: true },
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell>
      <PageHeader title="Palettenlabel" eyebrow="AIT Spedition" />
      <p className="mb-5 text-sm text-grey-mid">
        Erzeugt ein PDF mit einer A4-Seite (quer) pro Label. Kein Bezug zum Lieferschein-System.
      </p>

      <Panel className="max-w-lg p-6">
        <form
          method="POST"
          action="/ait/palettenlabel/pdf"
          target="_blank"
          className="space-y-5"
        >
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-grey-mid">
              SKU
            </label>
            <input
              list="sku-list"
              name="sku"
              required
              autoComplete="off"
              placeholder="SKU eingeben oder suchen…"
              className="w-full rounded-lg border border-grey-border bg-white px-3 py-2.5 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10"
            />
            <datalist id="sku-list">
              {items.map((item) => (
                <option key={item.sku} value={item.sku} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-grey-mid">
                Anzahl (Stück)
              </label>
              <input
                type="number"
                name="anzahl"
                min={1}
                defaultValue={1}
                required
                className="w-full rounded-lg border border-grey-border bg-white px-3 py-2.5 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-grey-mid">
                Anzahl Labels
              </label>
              <input
                type="number"
                name="anzahlLabels"
                min={1}
                max={50}
                defaultValue={1}
                required
                className="w-full rounded-lg border border-grey-border bg-white px-3 py-2.5 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-grey-mid">
              Lieferschein-Nr.
            </label>
            <input
              type="text"
              name="lieferscheinNr"
              placeholder="z.B. LS-AIT-0001"
              className="w-full rounded-lg border border-grey-border bg-white px-3 py-2.5 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-grey-mid">
              Abholdatum
            </label>
            <input
              type="date"
              name="abholdatum"
              defaultValue={today}
              required
              className="w-full rounded-lg border border-grey-border bg-white px-3 py-2.5 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-red px-4 py-3 font-mono text-sm font-semibold text-white hover:bg-brand-red-dark transition-colors"
          >
            PDF erstellen & herunterladen
          </button>
        </form>
      </Panel>
    </AppShell>
  );
}
