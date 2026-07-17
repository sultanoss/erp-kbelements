import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import JSZip from "jszip";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type") ?? "all";
  const marketplace = searchParams.get("marketplace") ?? "";
  const pm = searchParams.get("pm") ?? "";

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(type === "rechnung" ? { docType: "rechnung", status: "aktiv" } : {}),
      ...(type === "storniert" ? { docType: "rechnung", status: "storniert" } : {}),
      ...(type === "gutschrift" ? { docType: "gutschrift" } : {}),
      ...(type === "all" ? { docType: { in: ["rechnung", "gutschrift"] as string[] } } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
            },
          }
        : {}),
      ...(marketplace ? { marketplace } : {}),
      ...(pm ? { paymentMethod: pm } : {}),
    },
    include: { items: { orderBy: { pos: "asc" }, include: { skus: true } } },
    orderBy: { date: "asc" },
  });

  if (invoices.length === 0) {
    return new Response("Keine Rechnungen im gewählten Zeitraum gefunden.", { status: 404 });
  }

  const zip = new JSZip();

  for (const inv of invoices) {
    const pdfBytes = await generateInvoicePdf(inv);
    zip.file(`${inv.number}.pdf`, pdfBytes);
  }

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `kbelements-rechnungen-${dateStr}.zip`;

  return new Response(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
