import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({ where: { id }, select: { number: true } });
  return { title: `Lieferschein ${inv?.number ?? ""}` };
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif !important; font-size: 10pt; color: #000; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 20mm 20mm 35mm 25mm; margin: 0 auto; position: relative; border-top: 2px solid #000; }
  .header-bar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14mm; }
  .sender-small { font-size: 7.5pt; color: #444; border-bottom: 1px solid #aaa; padding-bottom: 2px; margin-bottom: 5mm; }
  .customer-block { font-size: 10pt; line-height: 1.55; }
  .company-block { text-align: right; font-size: 9pt; line-height: 1.55; }
  .company-block .name { font-weight: 900; font-size: 16pt; letter-spacing: -0.5px; line-height: 1.2; }
  .company-block .contact { font-size: 8pt; color: #555; margin-top: 4px; }
  .doc-title { font-size: 26pt; font-weight: 900; letter-spacing: -0.5px; color: #000; margin-bottom: 5mm; }
  .meta-block { float: right; font-size: 9pt; line-height: 1.7; margin-bottom: 8mm; }
  .meta-block table td:first-child { padding-right: 14px; color: #444; }
  .meta-block table td:last-child { font-weight: bold; }
  .clearfix::after { content: ''; display: table; clear: both; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 4mm; font-size: 9pt; }
  table.items th { background: #f0f0f0; color: #000; border-bottom: 1.5px solid #000; padding: 6px 7px; text-align: left; font-weight: bold; font-size: 8.5pt; }
  table.items th.r, table.items td.r { text-align: right; }
  table.items td { padding: 5px 6px; border-bottom: 0.5px solid #e0e0e0; vertical-align: top; }
  .notes-block { margin-top: 5mm; font-size: 9pt; color: #333; font-style: italic; }
  .sign-section { margin-top: 20mm; display: flex; gap: 40mm; }
  .sign-box { flex: 1; border-top: 1px solid #666; padding-top: 2mm; font-size: 8pt; color: #555; }
  .footer { position: fixed; bottom: 12mm; left: 25mm; right: 20mm; border-top: 0.5px solid #ccc; padding-top: 3mm; display: flex; justify-content: space-between; font-size: 7.5pt; color: #555; }
  .footer .col { line-height: 1.5; }
  .page-num { position: fixed; bottom: 5mm; right: 20mm; font-size: 7pt; color: #999; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .no-print { display: none !important; }
    @page { size: A4; margin: 0; }
  }
`;

export default async function LieferscheinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { pos: "asc" }, include: { skus: true } } },
  });
  if (!inv) notFound();

  const shipping = inv.shippingCost ?? 0;
  const totalItems = inv.items.reduce((s, it) => s + it.quantity, 0);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <PrintButton />

      <div className="page">
        {/* Header */}
        <div className="header-bar">
          <div style={{ maxWidth: "55%" }}>
            <div className="sender-small">KB ELEMENTS · Im Weidchen 21 · 52353 Düren</div>
            <div className="customer-block">
              <div style={{ fontWeight: "bold" }}>{inv.customerName}</div>
              <div style={{ whiteSpace: "pre-line" }}>{inv.customerAddress}</div>
            </div>
          </div>
          <div className="company-block">
            <div className="name">KB ELEMENTS</div>
            <div style={{ marginTop: "4px" }}>Im Weidchen 21 · 52353 Düren</div>
            <div className="contact">verkauf@kbelements.de</div>
          </div>
        </div>

        {/* Titel + Meta */}
        <div className="clearfix">
          <div className="doc-title">Lieferschein</div>
          <div className="meta-block">
            <table>
              <tbody>
                <tr><td>Lieferschein-Nr:</td><td>{inv.number}</td></tr>
                <tr><td>Datum:</td><td>{fmtDate(inv.date)}</td></tr>
                <tr><td>Rechnungs-Nr:</td><td>{inv.number}</td></tr>
                {inv.customerNum && <tr><td>Kunden-Nr:</td><td>{inv.customerNum}</td></tr>}
                <tr><td>Gesamt Stück:</td><td>{totalItems.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Positionen – OHNE Preise */}
        <table className="items">
          <thead>
            <tr>
              <th style={{ width: "28px" }}>Pos.</th>
              <th style={{ width: "48px" }}>Menge</th>
              <th style={{ width: "110px" }}>Art.-Nr.</th>
              <th>Bezeichnung</th>
              <th className="r" style={{ width: "60px" }}>Lager</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it) => (
              <tr key={it.id}>
                <td>{it.pos}</td>
                <td>{it.quantity.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</td>
                <td style={{ fontFamily: "monospace", fontSize: "8.5pt" }}>{it.skus.map((s) => s.sku).join(" + ") || "—"}</td>
                <td style={{ whiteSpace: "pre-line" }}>{it.description}</td>
                <td className="r" style={{ fontSize: "8pt", color: "#666" }}>
                  {it.skus.map((s) => s.lager === "ns" ? "NS" : s.lager === "neuware" ? "NW" : "").filter(Boolean).join("/")}
                </td>
              </tr>
            ))}
            {inv.shippingCost !== null && (
              <tr>
                <td>—</td>
                <td>1,00</td>
                <td style={{ fontFamily: "monospace", fontSize: "8.5pt" }}>VERSAND</td>
                <td>Versand / Transport</td>
                <td />
              </tr>
            )}
          </tbody>
        </table>

        {inv.notes && <div className="notes-block">{inv.notes}</div>}

        {/* Unterschriftsfelder */}
        <div className="sign-section">
          <div className="sign-box">Datum, Unterschrift Empfänger</div>
          <div className="sign-box">Datum, Unterschrift Versender</div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <div className="col">
          <div style={{ fontWeight: "bold" }}>KB ELEMENTS GmbH</div>
          <div>Im Weidchen 21</div>
          <div>52353 Düren</div>
        </div>
        <div className="col">
          <div>Amtsgericht Düren, HRB 8363</div>
          <div>USt-ID-/VAT ID- DE323 000 595</div>
          <div>Steuer-Nr. 207/572/01773</div>
          <div>Geschäftsführer: Hassan Karime</div>
        </div>
        <div className="col">
          <div>Bank 1: Sparkasse Düren</div>
          <div>IBAN: DE25 3955 0110 1201 3854 97</div>
          <div>SWIFT: SDUEDE33XXX</div>
          <div>Bank 2: Sparkasse Heidelberg</div>
          <div>IBAN: DE82 6725 0020 0009 2936 55</div>
          <div>SWIFT: SOLADES1HDB</div>
        </div>
      </div>
      <div className="page-num">Seite: 1</div>
    </>
  );
}
