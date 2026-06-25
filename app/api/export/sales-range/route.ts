import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

const MP_LABELS: Record<string, string> = {
  OTTO: "Otto", KAUFLAND: "Kaufland", MEDIAMARKT: "Media Markt",
  AMAZON: "Amazon", EBAY: "Ebay", SHOPIFY: "Shopify", DIREKT: "Lager",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);
  const von = req.nextUrl.searchParams.get("von") ?? today;
  const bis = req.nextUrl.searchParams.get("bis") ?? today;

  const from = new Date(`${von}T00:00:00`);
  const to = new Date(`${bis}T23:59:59`);

  const sales = await prisma.sale.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: [{ date: "asc" }, { sku: "asc" }],
  });

  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([
    ["Datum", "Marktplatz", "SKU", "Menge"],
    ...sales.map((s) => [
      new Date(s.date).toLocaleDateString("de-DE"),
      MP_LABELS[s.marketplace] ?? s.marketplace,
      s.sku,
      s.quantity,
    ]),
  ]);
  ws["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 8 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Verkäufe");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="verkaufe-${von}-${bis}.xlsx"`,
    },
  });
}
