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

  // Eingegebene Preise sind BRUTTO — Netto wird rückgerechnet
  const bruttoSum = inv.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const netto = inv.mwstRate > 0 ? bruttoSum / (1 + inv.mwstRate / 100) : bruttoSum;
  const mwstAmt = bruttoSum - netto;

  // Offener Betrag: 0 wenn Zahlungsinfo vorhanden
  const offenerBetrag = inv.paymentInfo ? 0 : bruttoSum;

  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <title>{inv.number}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; background: #fff; }
          .page { width: 210mm; min-height: 297mm; padding: 20mm 20mm 35mm 25mm; margin: 0 auto; position: relative; }
          .header-bar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14mm; }
          .sender-small { font-size: 7.5pt; color: #444; border-bottom: 1px solid #aaa; padding-bottom: 2px; margin-bottom: 5mm; }
          .customer-block { font-size: 10pt; line-height: 1.55; }
          .company-block { text-align: right; font-size: 9.5pt; line-height: 1.6; }
          .company-block .name { font-weight: bold; font-size: 14pt; letter-spacing: -0.5px; }
          .rechnung-title { font-size: 22pt; font-weight: bold; margin-bottom: 5mm; }
          .meta-block { float: right; font-size: 9pt; line-height: 1.7; margin-bottom: 8mm; }
          .meta-block table td:first-child { padding-right: 14px; color: #444; }
          .meta-block table td:last-child { font-weight: bold; }
          .clearfix::after { content: ''; display: table; clear: both; }
          table.items { width: 100%; border-collapse: collapse; margin-top: 4mm; font-size: 9pt; }
          table.items th { background: #f5f5f5; border-bottom: 1.5px solid #bbb; padding: 5px 6px; text-align: left; font-weight: bold; font-size: 8.5pt; }
          table.items th.r, table.items td.r { text-align: right; }
          table.items td { padding: 5px 6px; border-bottom: 0.5px solid #e0e0e0; vertical-align: top; }
          .notes-block { margin-top: 5mm; font-size: 9pt; color: #333; font-style: italic; }
          .totals-wrap { margin-top: 6mm; display: flex; justify-content: flex-end; }
          .totals { width: 230px; font-size: 9.5pt; border-collapse: collapse; }
          .totals td { padding: 2.5px 0; }
          .totals td:last-child { text-align: right; padding-left: 12px; }
          .totals .sep { border-top: 1px solid #aaa; }
          .totals .bold td { font-weight: bold; }
          .payment-row { margin-top: 4mm; font-size: 8.5pt; color: #444; text-align: right; }
          .footer { position: fixed; bottom: 12mm; left: 25mm; right: 20mm; border-top: 0.5px solid #ccc; padding-top: 3mm; display: flex; justify-content: space-between; font-size: 7.5pt; color: #555; }
          .footer .col { line-height: 1.5; }
          .page-num { position: fixed; bottom: 5mm; right: 20mm; font-size: 7pt; color: #999; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .no-print { display: none; }
            @page { size: A4; margin: 0; }
          }
          .print-btn { position: fixed; top: 18px; right: 18px; background: #C0182A; color: #fff; border: none; padding: 10px 22px; font-size: 13px; font-weight: bold; cursor: pointer; border-radius: 6px; z-index: 999; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        `}</style>
      </head>
      <body>
        <button className="print-btn no-print" onClick={() => {}} id="printBtn">🖨 Drucken / PDF</button>
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
            <div className="meta-block">
              <table>
                <tbody>
                  <tr><td>Rechnungs-Nr:</td><td>{inv.number}</td></tr>
                  <tr><td>Datum:</td><td>{fmtDate(inv.date)}</td></tr>
                  <tr><td>Lieferdatum:</td><td>{fmtDate(inv.date)}</td></tr>
                  {inv.customerNum && <tr><td>Kunden-Nr:</td><td>{inv.customerNum}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Positionen */}
          <table className="items">
            <thead>
              <tr>
                <th style={{ width: "28px" }}>Pos.</th>
                <th style={{ width: "48px" }}>Menge</th>
                <th style={{ width: "95px" }}>Art.-Nr.</th>
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
                  <td>{it.quantity.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "8.5pt" }}>{it.artNr ?? ""}</td>
                  <td style={{ whiteSpace: "pre-line" }}>{it.description}</td>
                  <td className="r">{inv.mwstRate},00 %</td>
                  <td className="r">{fmt(it.unitPrice)} €</td>
                  <td className="r">{fmt(it.quantity * it.unitPrice)} €</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Notiz */}
          {inv.notes && (
            <div className="notes-block">{inv.notes}</div>
          )}

          {/* Summen */}
          <div className="totals-wrap">
            <table className="totals">
              <tbody>
                <tr><td>Gesamt Netto ({inv.mwstRate},00 %)</td><td>{fmt(netto)} €</td></tr>
                {inv.mwstRate > 0 && <tr><td>zzgl. MwSt ({inv.mwstRate},00 %)</td><td>{fmt(mwstAmt)} €</td></tr>}
                <tr className="bold sep"><td><strong>Rechnungsbetrag</strong></td><td><strong>{fmt(bruttoSum)} €</strong></td></tr>
                <tr className="bold"><td><strong>Zahlbetrag</strong></td><td><strong>{fmt(bruttoSum)} €</strong></td></tr>
              </tbody>
            </table>
          </div>

          {/* Zahlungsinfo — immer anzeigen */}
          <div className="payment-row">
            {inv.paymentInfo && <div>{inv.paymentInfo} {fmt(bruttoSum)} €</div>}
            <div style={{ fontWeight: "bold", marginTop: "2px" }}>Offener Betrag {fmt(offenerBetrag)} €</div>
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

        <script dangerouslySetInnerHTML={{ __html: `document.getElementById('printBtn').onclick = function(){ window.print(); };` }} />
      </body>
    </html>
  );
}
