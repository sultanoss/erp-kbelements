import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";

export async function GET(req: Request) {
  await requireUser();

  const { searchParams } = new URL(req.url);
  const lager = searchParams.get("lager") ?? "beide";

  const items = await prisma.item.findMany({
    select: { sku: true, name: true, stock: true, stockNS: true },
    orderBy: { sku: "asc" },
  });

  const date = new Date().toISOString().slice(0, 10);

  let header: string[];
  let rows: string[][];

  if (lager === "neuware") {
    header = ["SKU", "Bezeichnung", "Neuware-Lager"];
    rows = items.map((i) => [i.sku, i.name, String(i.stock)]);
  } else if (lager === "ns") {
    header = ["SKU", "Bezeichnung", "NS-Lager"];
    rows = items.map((i) => [i.sku, i.name, String(i.stockNS)]);
  } else {
    header = ["SKU", "Bezeichnung", "Neuware-Lager", "NS-Lager"];
    rows = items.map((i) => [i.sku, i.name, String(i.stock), String(i.stockNS)]);
  }

  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");

  const suffix = lager === "neuware" ? "-neuware" : lager === "ns" ? "-ns" : "";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lager-export${suffix}-${date}.csv"`,
    },
  });
}
