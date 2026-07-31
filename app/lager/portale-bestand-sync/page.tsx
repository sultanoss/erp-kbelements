import { prisma } from "@/lib/prisma";
import SyncClient from "./SyncClient";

export default async function PortaleBestandSyncPage() {
  const mappings = await prisma.skuMapping.findMany({
    orderBy: [{ marketplace: "asc" }, { marketplaceSku: "asc" }],
    include: {
      items: {
        include: { item: { select: { stock: true } } },
      },
    },
  });

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Portale Bestand Sync</h1>
      <SyncClient mappings={mappings} />
    </div>
  );
}
