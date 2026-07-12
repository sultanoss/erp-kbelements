import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ActivityType } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const von = searchParams.get("von");
  const bis = searchParams.get("bis");
  const type = searchParams.get("type");

  const logs = await prisma.activityLog.findMany({
    take: 1000,
    orderBy: { createdAt: "desc" },
    include: { user: true },
    where: {
      ...(type ? { type: type as ActivityType } : {}),
      ...(von || bis
        ? {
            createdAt: {
              ...(von ? { gte: new Date(`${von}T00:00:00`) } : {}),
              ...(bis ? { lte: new Date(`${bis}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
  });

  const XLSX = await import("xlsx");

  const typeLabel: Record<string, string> = {
    SALE: "Verkauf",
    RECEIPT: "Wareneingang",
    CORRECTION: "Korrektur",
    USER_CHANGE: "Benutzeränderung",
  };

  const headers = [
    "Datum",
    "Zeit",
    "Typ",
    "SKU",
    "Alt (Bestand)",
    "Neu (Bestand)",
    "Menge Neuware-Lager",
    "Menge NS-Lager",
    "Benutzer",
    "Notiz",
  ];

  const rows = logs.map((log) => {
    const dt = new Date(log.createdAt);
    const datum = dt.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const zeit = dt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const delta = (log.newStock ?? 0) - (log.oldStock ?? 0);
    const isNeuware = log.note?.includes("Neuware-Lager");
    const isNS = log.note?.includes("NS-Lager");

    return [
      datum,
      zeit,
      typeLabel[log.type] ?? log.type,
      log.sku ?? "",
      log.oldStock ?? "",
      log.newStock ?? "",
      isNeuware ? delta : "",
      isNS ? delta : "",
      log.user.name,
      log.note ?? "",
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 16 },
    { wch: 18 },
    { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Protokoll");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const today = new Date().toISOString().slice(0, 10);
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="protokoll-${today}.xlsx"`,
    },
  });
}
