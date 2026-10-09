import { prisma } from "@/lib/prisma";
import { NeuerAuftragForm } from "./neuer-auftrag-form";

export const metadata = { title: "Neuer Auftrag" };

export default async function NeuerAuftragPage() {
  const items = await prisma.item.findMany({
    select: { sku: true, name: true },
    orderBy: { sku: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-grey-dark">Neuer Auftrag</h1>
        <p className="mt-1 font-mono text-xs text-grey-mid">Manueller Direktauftrag — wird als DIREKT erfasst</p>
      </div>
      <NeuerAuftragForm allItems={items} />
    </div>
  );
}
