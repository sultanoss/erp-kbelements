import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtNum(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type") ?? "all";

  // Build where clause
  const docTypeFilter =
    type === "rechnung" ? { docType: "rechnung" as const, status: "aktiv" as const } :
    type === "storniert" ? { docType: "rechnung" as const, status: "storniert" as const } :
    type === "gutschrift" ? { docType: "gutschrift" as const } :
    // "all" — Rechnungen (aktiv+storniert) + Gutschriften, kein Angebot
    { docType: { in: ["rechnung", "gutschrift"] as const } };

  const invoices = await prisma.invoice.findMany({
    where: {
      ...docTypeFilter,
      ...((from || to) && {
        date: {
          ...(from && { gte: new Date(`${from}T00:00:00`) }),
          ...(to && { lte: new Date(`${to}T23:59:59.999`) }),
        },
      }),
    },
    include: { items: true },
    orderBy: { date: "asc" },
  });

  // Build CSV rows
  const BOM = "﻿";
  const header = ["Belegart", "Belegnummer", "Datum", "Kundennummer", "Kundenname", "Bruttobetrag", "MwSt-Satz (%)", "Nettobetrag", "MwSt-Betrag", "Status"];

  const rows = invoices.map((inv) => {
    const bruttoPositionen = inv.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    const shipping = inv.shippingCost ?? 0;
    const brutto = bruttoPositionen + shipping;
    const netto = inv.mwstRate > 0 ? brutto / (1 + inv.mwstRate / 100) : brutto;
    const mwstBetrag = brutto - netto;

    const belegart =
      inv.docType === "gutschrift" ? "Gutschrift" :
      inv.status === "storniert" ? "Storniert" :
      "Rechnung";

    return [
      belegart,
      inv.number,
      fmtDate(inv.date),
      inv.customerNum ?? "",
      inv.customerName,
      fmtNum(brutto),
      String(inv.mwstRate),
      fmtNum(netto),
      fmtNum(mwstBetrag),
      inv.status,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";");
  });

  const csv = BOM + [header.map((h) => `"${h}"`).join(";"), ...rows].join("\r\n");

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `kbelements-export-${dateStr}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
