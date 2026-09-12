import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";

export async function GET(req: Request) {
  await requireUser();

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || undefined;
  const to   = searchParams.get("to")   || undefined;

  const customers = await prisma.b2bCustomer.findMany({ select: { name: true } });
  const b2bNames  = customers.map((c) => c.name);

  const invoices = await prisma.invoice.findMany({
    where: {
      status: "aktiv",
      customerName: { in: b2bNames },
      ...(from || to ? {
        date: {
          ...(from ? { gte: new Date(from + "T00:00:00") } : {}),
          ...(to   ? { lte: new Date(to   + "T23:59:59") } : {}),
        },
      } : {}),
    },
    include: { items: true },
    orderBy: { date: "desc" },
  });

  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

  const header = [
    "Rechnungs-Nr.", "Datum", "Kunde", "Kunden-Nr.",
    "Netto (€)", "MwSt (€)", "Brutto (€)", "Zahlart", "Bezahlt",
  ];

  const rows = invoices.map((inv) => {
    const netto  = inv.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) + (inv.shippingCost ?? 0);
    const mwst   = netto * ((inv.mwstRate ?? 19) / 100);
    const brutto = netto + mwst;
    return [
      inv.number,
      fmt(inv.date),
      inv.customerName,
      inv.customerNum ?? "",
      +netto.toFixed(2),
      +mwst.toFixed(2),
      +brutto.toFixed(2),
      inv.paymentMethod ?? "",
      inv.bezahlt ? "Ja" : "Nein",
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [
    { wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "B2B Bestellungen");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const dateStr = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="b2b-bestellungen-${dateStr}.xlsx"`,
    },
  });
}
