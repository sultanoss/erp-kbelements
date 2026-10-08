import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  await requireUser();

  const { searchParams } = new URL(req.url);
  const lager = searchParams.get("lager") ?? "beide";

  const items = await prisma.item.findMany({
    select: { sku: true, name: true, stock: true, stockNS: true },
    orderBy: { sku: "asc" },
  });

  const date = new Date().toISOString().slice(0, 10);

  let rows: { SKU: string; Menge: number }[] | { SKU: string; "Neuware-Lager": number; "NS-Lager": number }[];
  let suffix: string;

  if (lager === "neuware") {
    rows = items.map((i) => ({ SKU: i.sku, Menge: i.stock }));
    suffix = "-neuware";
  } else if (lager === "ns") {
    rows = items.map((i) => ({ SKU: i.sku, Menge: i.stockNS }));
    suffix = "-ns";
  } else {
    rows = items.map((i) => ({ SKU: i.sku, "Neuware-Lager": i.stock, "NS-Lager": i.stockNS }));
    suffix = "";
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Lager");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="lager-export${suffix}-${date}.xlsx"`,
    },
  });
}
