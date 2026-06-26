import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function DruckenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { pos: "asc" } } },
  });
  if (!inv) notFound();

  const netto = inv.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const mwstAmt = netto * (inv.mwstRate / 100);
  const brutto = netto + mwstAmt;
  const offenerBetrag = inv.paymentInfo ? 0 : brutto;

  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <title>{inv.number}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; background: #fff; }
          .page { width: 210mm; min-height: 297mm; padding: 20mm 20mm 25mm 25mm; margin: 0 auto; position: relative; }
          .header-bar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18mm; }
          .sender-small { font-size: 7.5pt; color: #444; border-bottom: 1px solid #aaa; padding-bottom: 2px; margin-bottom: 6mm; }
          .customer-block { font-size: 10pt; line-height: 1.5; }
          .company-block { text-align: right; font-size: 9.5pt; line-height: 1.6; }
          .company-block .name { font-weight: bold; font-size: 13pt; }
          .rechnung-title { font-size: 20pt; font-weight: bold; margin-bottom: 6mm; }
          .meta-table { float: right; font-size: 9pt; line-height: 1.6; margin-bottom: 8mm; }
          .meta-table td:first-child { padding-right: 12px; color: #444; }
          .meta-table td:last-child { font-weight: bold; }
          .clearfix::after { content: ''; display: table; clear: both; }
          table.items { width: 100%; border-collapse: collapse; margin-top: 6mm; font-size: 9pt; }
          table.items th { background: #f5f5f5; border-bottom: 1.5px solid #ccc; padding: 4px 6px; text-align: left; font-weight: bold; font-size: 8.5pt; }
          table.items th.r, table.items td.r { text-align: right; }
          table.items td { padding: 4px 6px; border-bottom: 0.5px solid #e0e0e0; vertical-align: top; }
          .totals { margin-top: 6mm; float: right; width: 220px; font-size: 9.5pt; }
          .totals table { width: 100%; border-collapse: collapse; }
          .totals td { padding: 2px 0; }
          .totals td:last-child { text-align: right; }
          .totals .bold { font-weight: bold; border-top: 1px solid #aaa; padding-top: 3px; }
          .footer { position: fixed; bottom: 15mm; left: 25mm; right: 20mm; border-top: 0.5px solid #ccc; padding-top: 4mm; display: flex; justify-content: space-between; font-size: 7.5pt; color: #555; }
          .footer .col { line-height: 1.5; }
          .notes { margin-top: 20mm; font-size: 9pt; color: #333; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .no-print { display: none; }
            @page { size: A4; margin: 0; }
          }
          .print-btn { position: fixed; top: 20px; right: 20px; background: #C0182A; color: #fff; border: none; padding: 10px 20px; font-size: 13px; font-weight: bold; cursor: pointer; border-radius: 6px; z-index: 999; }
        `}</style>
      </head>
      <body>
        <button className="print-btn no-print" onClick={() => window.print()}>🖨 Drucken / PDF</button>
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
              <div>Im Weidchen 21</div>
              <div>52353 Düren</div>
              <br />
              <div>verkauf@kbelements.de</div>
              <div>E-Mail: info@kbelements.de</div>
            </div>
          </div>

          {/* Titel + Meta */}
          <div className="clearfix">
            <div className="rechnung-title">Rechnung</div>
            <table className="meta-table">
              <tbody>
                <tr><td>Rechnungs-Nr:</td><td>{inv.number}</td></tr>
                <tr><td>Datum:</td><td>{fmtDate(inv.date)}</td></tr>
                <tr><td>Lieferdatum:</td><td>{fmtDate(inv.date)}</td></tr>
                {inv.customerNum && <tr><td>Kunden-Nr:</td><td>{inv.customerNum}</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Positionen */}
          <table className="items">
            <thead>
              <tr>
                <th style={{ width: "30px" }}>Pos.</th>
                <th style={{ width: "50px" }}>Menge</th>
                <th style={{ width: "100px" }}>Art.-Nr.</th>
                <th>Bezeichnung</th>
                <th className="r" style={{ width: "50px" }}>MwSt.</th>
                <th className="r" style={{ width: "80px" }}>E.-Preis</th>
                <th className="r" style={{ width: "80px" }}>G.-Preis</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it) => (
                <tr key={it.id}>
                  <td>{it.pos}</td>
                  <td>{it.quantity.toLocaleString("de-DE")},00</td>
                  <td style={{ fontFamily: "monospace", fontSize: "8.5pt" }}>{it.artNr ?? ""}</td>
                  <td style={{ whiteSpace: "pre-line" }}>{it.description}{inv.notes ? `\n${inv.notes}` : ""}</td>
                  <td className="r">{inv.mwstRate},00 %</td>
                  <td className="r">{fmt(it.unitPrice)} €</td>
                  <td className="r">{fmt(it.quantity * it.unitPrice)} €</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summen */}
          <div className="clearfix">
            <div className="totals">
              <table>
                <tbody>
                  <tr><td>Gesamt Netto ({inv.mwstRate},00 %)</td><td>{fmt(netto)} €</td></tr>
                  {inv.mwstRate > 0 && <tr><td>zzgl. MwSt ({inv.mwstRate},00 %)</td><td>{fmt(mwstAmt)} €</td></tr>}
                  <tr className="bold"><td><strong>Rechnungsbetrag</strong></td><td><strong>{fmt(brutto)} €</strong></td></tr>
                  <tr className="bold"><td><strong>Zahlbetrag</strong></td><td><strong>{fmt(brutto)} €</strong></td></tr>
                  {inv.paymentInfo && <tr><td colSpan={2} style={{ fontSize: "8.5pt", paddingTop: "4px", color: "#444" }}>{inv.paymentInfo}</td></tr>}
                  <tr className="bold"><td>Offener Betrag</td><td>{fmt(offenerBetrag)} €</td></tr>
                </tbody>
              </table>
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
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          document.querySelector('.print-btn').addEventListener('click', function() { window.print(); });
        `}} />
      </body>
    </html>
  );
}
