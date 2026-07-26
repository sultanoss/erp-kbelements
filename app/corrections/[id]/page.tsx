import { updateCorrection } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Field, Panel, SelectField, SubmitButton } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditCorrectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const correction = await prisma.correction.findUnique({
    where: { id },
    include: { item: true },
  });
  if (!correction) notFound();

  const dateStr = correction.date.toISOString().slice(0, 10);

  return (
    <AppShell>
      <PageHeader title="Korrektur bearbeiten" eyebrow={`SKU: ${correction.sku}`} />
      <Panel className="p-5 max-w-2xl">
        <form action={updateCorrection} className="grid gap-5">
          <input type="hidden" name="id" value={correction.id} />

          <Field label="Datum" name="date" type="date" defaultValue={dateStr} />

          <div className="grid gap-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">SKU</span>
            <div className="h-10 flex items-center rounded-lg border border-grey-border bg-grey-light px-3 font-mono text-sm font-semibold text-brand-red">
              {correction.sku}
            </div>
          </div>

          <SelectField label="Lager" name="lager" defaultValue={correction.lager}>
            <option value="neuware">Neuware-Lager</option>
            <option value="ns">NS-Lager</option>
          </SelectField>

          <Field label="Menge" name="quantity" type="number" defaultValue={correction.quantity} />

          <Field label="Grund" name="reason" defaultValue={correction.reason} placeholder="Inventur, Bruch ..." />

          <SelectField label="Austausch" name="austausch" defaultValue={correction.austausch ? "ja" : "nein"}>
            <option value="nein">Nein</option>
            <option value="ja">Ja</option>
          </SelectField>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-mono text-xs text-amber-700">
            Bestandsänderung: Die alte Korrektur ({correction.quantity > 0 ? "+" : ""}{correction.quantity} {correction.lager === "ns" ? "NS-Lager" : "Neuware"}) wird rückgängig gemacht und durch die neue ersetzt.
          </div>

          <div className="flex gap-3">
            <SubmitButton>Speichern</SubmitButton>
            <a
              href="/corrections"
              className="h-10 inline-flex items-center rounded-lg border border-grey-border bg-white px-4 font-mono text-sm font-semibold text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors"
            >
              Abbrechen
            </a>
          </div>
        </form>
      </Panel>
    </AppShell>
  );
}
